import { Readable } from "node:stream";
import type { Plugin } from "vite";

import generate from "@babel/generator";
import { parse } from "@babel/parser";
import { state } from "../server/state";
import { ROUTES_PATH } from "../utils/constants";
import { cleanServerExport, pruneUnusedImports } from "../utils/ast";

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
      // Make sure we're only transforming files inside routes.
      if (!id.startsWith(ROUTES_PATH)) return;

      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      cleanServerExport(ast);
      pruneUnusedImports(ast);

      const output = generate(ast, { retainLines: false }, code);

      return {
        code: output.code,
      };
    },
  };
};
