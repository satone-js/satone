import { Readable } from "node:stream";
import type { Plugin } from "vite";

import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import { state } from "../server/state";
import { ROUTES_PATH } from "../utils/constants";

export const elysia = (): Plugin => {
  return {
    enforce: "pre",
    name: "@satone/elysia",
    configureServer(server) {
      server.middlewares.use(async (hreq, hres, next) => {
        if (
          !state.elysia.routes.find(
            (route) => route.path === hreq.url && route.method === hreq.method
          )
        ) {
          next();
          return;
        }

        try {
          const path = hreq.url || "/";
          const host = hreq.headers.host || "localhost";
          const url = new URL(`http://${host}${path}`);

          const headers = new Headers();
          for (let i = 0; i < hreq.rawHeaders.length; i += 2) {
            const key = hreq.rawHeaders[i]!;
            const value = hreq.rawHeaders[i + 1]!;
            headers.append(key, value);
          }

          let body: ReadableStream | null = null;
          if (hreq.method !== "GET" && hreq.method !== "HEAD") {
            body = new ReadableStream({
              start(controller) {
                hreq.on("data", (chunk) => {
                  controller.enqueue(chunk);
                });
                hreq.on("end", () => {
                  controller.close();
                });
                hreq.on("error", (err) => {
                  controller.error(err);
                });
              },
            });
          }

          const req = new Request(url.href, {
            method: hreq.method,
            headers,
            body,
          });

          // Use our Elysia instance to handle the API request.
          const res = await state.elysia.handle(req);

          // Pipe everything to our HTTP server.
          hres.writeHead(
            res.status,
            res.statusText,
            Object.fromEntries(res.headers)
          );

          if (res.body) {
            Readable.fromWeb(res.body!).pipe(hres);
          } else hres.end();
        } catch (error) {
          console.error("next():", error);
          next();
        }
      });
    },
    transform(code, id) {
      if (!id.startsWith(ROUTES_PATH)) return;

      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      // traverse(ast, {
      //   ExportNamedDeclaration(path) {
      //     const decl = path.node.declaration;

      //     if (t.isVariableDeclaration(decl)) {
      //       decl.declarations = decl.declarations.filter(
      //         (d) =>
      //           !(
      //             t.isIdentifier(d.id) &&
      //             HTTP_METHODS.has(d.id.name.toUpperCase())
      //           )
      //       );

      //       if (decl.declarations.length === 0) {
      //         path.remove();
      //       }
      //     }

      //     if (t.isFunctionDeclaration(decl) && decl.id) {
      //       if (HTTP_METHODS.has(decl.id.name.toUpperCase())) {
      //         path.remove();
      //       }
      //     }
      //   },
      // });

      const used = new Set<string>();
      traverse(ast, {
        Identifier(path) {
          if (
            t.isImportSpecifier(path.parent) ||
            t.isImportDefaultSpecifier(path.parent) ||
            t.isImportNamespaceSpecifier(path.parent) ||
            t.isFunctionDeclaration(path.parent) ||
            t.isVariableDeclarator(path.parent)
          )
            return;

          used.add(path.node.name);
        },
      });

      traverse(ast, {
        ImportDeclaration(path) {
          path.node.specifiers = path.node.specifiers.filter((spec) => {
            if (
              t.isImportSpecifier(spec) ||
              t.isImportDefaultSpecifier(spec) ||
              t.isImportNamespaceSpecifier(spec)
            ) {
              return used.has(spec.local.name);
            }
            return true;
          });

          if (path.node.specifiers.length === 0) {
            path.remove();
          }
        },
      });

      const output = generate(ast, { retainLines: true }, code);

      return {
        code: output.code,
      };
    },
  };
};
