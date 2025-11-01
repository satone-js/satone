import { Readable } from "node:stream";
import type { Plugin } from "vite";

import generate from "@babel/generator";
import { parse } from "@babel/parser";
import { state } from "../server/state";
import {
  BUILD_FOLDER,
  GLOB,
  ROUTES_PATH,
  SERVER_FOLDER,
} from "../utils/constants";
import {
  cleanServerExport,
  cleanViewExport,
  containsViewExport,
  getAST,
  pruneUnusedImports,
} from "../utils/ast";
import { join, relative } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Glob } from "bun";
import { generateProdServerFile } from "../generator/prod";

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

    /**
     * - Removes unused imports
     * - Prunes the `export const server` variable which contains API
     *   source code and should not be distributed to front-end.
     */
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

    async generateBundle(client) {
      const now = Date.now();
      console.log("\n");

      // Let's create `.satone` production build folder.
      await rm(BUILD_FOLDER, { force: true, recursive: true });
      await mkdir(BUILD_FOLDER);

      // We want to take the pre-generated JS bundles from `node_modules/.satone/server`
      // because they're already made without extra imports.
      const GLOB = new Glob("**/*.js");

      // Find all routes.
      const paths: string[] = [];
      for await (const file of GLOB.scan(SERVER_FOLDER)) {
        const path = join(SERVER_FOLDER, file);
        paths.push(path);
      }

      const entrypoint = join(BUILD_FOLDER, "index.ts");
      await writeFile(entrypoint, generateProdServerFile(paths), "utf8");

      const bundles = await Bun.build({
        entrypoints: [entrypoint],
        packages: "bundle",
        splitting: true,
        target: "bun",
        minify: true,
        outdir: join(BUILD_FOLDER, "server"),
      });

      await rm(entrypoint);

      for (const bundle of bundles.outputs) {
        console.log(
          relative(process.cwd(), bundle.path),
          `(${bundle.size} bytes)`
        );
      }

      console.log(`✓ built in ${Date.now() - now}ms\n`);

      // Let's now manipulate the destination of the Vite output!
      client.dir = join(BUILD_FOLDER, "client");
    },
  };
};
