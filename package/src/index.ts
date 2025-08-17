#!/usr/bin/env bun
import { createServer, type Plugin } from "vite";
import solid from "vite-plugin-solid";
import pages from "vite-plugin-pages";
import { Elysia } from "elysia";
import { Glob } from "bun";
import { join } from "node:path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import generate from "@babel/generator";
import swagger from "@elysiajs/swagger";
import { Readable } from "node:stream";

function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

const glob = new Glob("**/*.ts[x]");
const ROUTES_PATH = join(process.cwd(), "src/routes");

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

/**
 * Read every routes and create an Elysia instance
 * out of them.
 *
 * Also looks up if these routes should be handled by
 * SolidJS or not.
 */
const reload = async () => {
  const renderables = new Set();
  let elysia = new Elysia().use(swagger());

  for await (const file of glob.scan(ROUTES_PATH)) {
    const path = join(ROUTES_PATH, file);
    const imports = await import(path);

    for (const method of HTTP_METHODS.values()) {
      if (!imports[method]) continue;
      const plugin = imports[method];

      // @ts-expect-error
      elysia = elysia.use(plugin);
    }

    if (imports.default) {
      renderables.add(file.replace("index", "/").replace(/\.ts[x]/, ""));
    }
  }

  return { elysia, renderables };
};

let state = await reload();

const elysia = (): Plugin => {
  return {
    enforce: "pre",
    name: "@satone/elysia",
    configureServer(server) {
      server.middlewares.use(async (hreq, hres, next) => {
        // Only run this middleware on routes registered by Elysia.
        if (
          !state.elysia.routes.find(
            (route) => route.path === hreq.url && route.method === hreq.method
          )
        ) {
          next();
          return;
        }

        try {
          // Build a `Request` instance out of our `IncomingMessage`.
          // NOTE: we're not checking if `https:`, not sure if this is important right now...
          const url = new URL(`http://${hreq.headers.host}${hreq.url!}`);
          const req = new Request(url.href, {
            method: hreq.method,
            headers: hreq.headers as Record<string, string>,
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

      let hasDefault = false;
      traverse(ast, {
        ExportDefaultDeclaration() {
          hasDefault = true;
        },
      });

      // Step 1: remove exported HTTP method declarations
      traverse(ast, {
        ExportNamedDeclaration(path) {
          const decl = path.node.declaration;

          if (t.isVariableDeclaration(decl)) {
            decl.declarations = decl.declarations.filter(
              (d) =>
                !(
                  t.isIdentifier(d.id) &&
                  HTTP_METHODS.has(d.id.name.toUpperCase())
                )
            );

            if (decl.declarations.length === 0) {
              path.remove();
            }
          }

          if (t.isFunctionDeclaration(decl) && decl.id) {
            if (HTTP_METHODS.has(decl.id.name.toUpperCase())) {
              path.remove();
            }
          }
        },
      });

      // Step 2: collect used identifiers
      const used = new Set<string>();
      traverse(ast, {
        Identifier(path) {
          // Skip identifiers that are being *declared*
          if (
            t.isImportSpecifier(path.parent) ||
            t.isImportDefaultSpecifier(path.parent) ||
            t.isImportNamespaceSpecifier(path.parent) ||
            t.isFunctionDeclaration(path.parent) ||
            t.isVariableDeclarator(path.parent)
          ) {
            return;
          }
          used.add(path.node.name);
        },
      });

      // Step 3: remove unused imports
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

const hmr = (): Plugin => {
  return {
    name: "@satone/hmr",
    async handleHotUpdate(ctx) {
      console.log(new Date(), "[hmr]: triggering updates...");

      // Keep trace of the previous rendered routes.
      const previousRenderables = state.renderables;

      // Clear the imports cache and reload Elysia.
      Loader.registry.clear();
      state = await reload();

      // Only full reload the webpage when rendered routes changed.
      if (!setsAreEqual(state.renderables, previousRenderables)) {
        console.log("full reload!");

        ctx.server.hot.send({ type: "full-reload" });
        ctx.server.moduleGraph.invalidateAll();
      }
    },
  };
};

const router = (): Plugin => {
  return pages({
    dirs: [ROUTES_PATH],
    onRoutesGenerated(routes) {
      routes = routes.filter(({ path }) => state.renderables.has(path));

      console.info(
        new Date(),
        "[pages]: reloading",
        routes.length,
        "route(s):",
        routes.map((r) => r.path)
      );

      return routes;
    },
  });
};

const vite = await createServer({
  plugins: [hmr(), elysia(), router(), solid()],
  clearScreen: false,
  logLevel: "silent",
});

console.log(new Date(), "[vite]: http://localhost:3000");
await vite.listen(3000);
