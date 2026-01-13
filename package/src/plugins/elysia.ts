import type { Connect, Plugin } from "vite";
import type { SatoneConfig } from "../config";

import { rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { Readable } from "node:stream";
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import dts from "bun-plugin-dtsx";
import { state } from "../server/state";
import {
  cleanServerExport,
  pruneUnusedImports
} from "../utils/ast";
import {
  BUILD_FOLDER,
  PROJECT_PATH,
  ROUTES_PATH
} from "../utils/constants";
import { newline } from "../utils/newline";

export const elysia = (config?: SatoneConfig): Plugin => {
  const toURL = (req: Connect.IncomingMessage): URL => {
    const rawUrl = req.url ?? "/";
    const host = req.headers?.host ?? "localhost";
    return new URL(rawUrl, `http://${host}`);
  };

  /** know whether we're on a server handled route */
  const hasRoute = (path: string, method: string): boolean =>
    state.elysia.routes.some((route) => route.path === path && route.method === method);

  /** know whether we're on the swagger route */
  const isSwagger = (path: string, method: string): boolean => {
    path = path.substring(1); // @see https://github.com/elysiajs/elysia-openapi/pull/243
    return Boolean(config && config.swagger && (config.swagger.path === path || config.swagger.path + "/json" === path) && method === "GET");
  };

  const toBodyStream = (req: Connect.IncomingMessage, method: string): null | ReadableStream => {
    if (method === "GET" || method === "HEAD") return null;

    return new ReadableStream({
      start(controller) {
        req.on("data", (chunk: Uint8Array) => controller.enqueue(chunk));
        req.on("end", () => controller.close());
        req.on("error", (err: unknown) => controller.error(err));
      }
    });
  };

  return {
    configureServer(server) {
      server.middlewares.use(async (hreq, hres, next) => {
        const method = hreq.method ?? "GET";
        const url = toURL(hreq);

        const executable = state.executables.find(
          ([_, pattern]) => pattern.test(url)
        ); ;

        if (
          (!executable || !hasRoute(executable[0] /** .path */, method))
          && !isSwagger(url.pathname, method)
        ) {
          next();
          return;
        }

        try {
          const headers = new Headers();
          for (let i = 0; i < hreq.rawHeaders.length; i += 2) {
            headers.append(hreq.rawHeaders[i]!, hreq.rawHeaders[i + 1]!);
          }

          const req = new Request(url.href, {
            body: toBodyStream(hreq, method),
            headers,
            method: hreq.method
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
          }
          else hres.end();
        }
        catch (error) {
          console.error(new Date(), "next:", error);
          next();
        }
      });
    },
    enforce: "pre",
    async generateBundle() {
      const now = Date.now();
      console.log("\n");

      // cleanup previous builds. ----------------------------------------------
      await rm(join(BUILD_FOLDER, "server"), { force: true, recursive: true });

      // generate the server entry! --------------------------------------------
      let server = newline("import Elysia from 'elysia'");

      // production middleware
      server += newline("import { prod } from 'satone/server/plugins/prod'");

      // openapi if swagger is specified
      if (config?.swagger) {
        server += newline("import { join } from 'node:path'");
        server += newline("import { openapi, openapiRefFromTypes } from 'satone/server/plugins/exports'");
      }

      // routes
      for (let curr = 0; curr < state.executables.length; curr++) {
        const [,, bundle] = state.executables[curr]!;

        server += newline(`import { server as plug${curr} } from ${JSON.stringify(
          bundle
        )}`);
      }

      // initiate elysia
      server += "export default new Elysia()";

      // add production middleware
      server += ".use(prod(import.meta.dir))";

      // add openapi if specified
      if (config?.swagger) {
        server += `.use(openapi({
          path: ${JSON.stringify(config.swagger.path)},
          specPath: ${JSON.stringify("/" + config.swagger.path + "/json")},
          references: openapiRefFromTypes(join(__dirname, 'server', 'index.d.ts'))
        }))`;
      }

      for (let curr = 0; curr < state.executables.length; curr++) {
        const [path] = state.executables[curr]!;

        server += `.group(${JSON.stringify(
          path
        )}, (app) => app.use(plug${curr}))`;
      }

      // bundle everything -----------------------------------------------------
      const entry = Bun.file(join(BUILD_FOLDER, "index.ts"));
      await Bun.write(entry, server);

      const bundles = await Bun.build({
        entrypoints: [entry.name!],
        minify: true,
        outdir: join(BUILD_FOLDER, "server"),
        packages: "bundle",
        plugins: [dts({
          // @ts-expect-error : they have their own build configuration
          outdir: join(BUILD_FOLDER, "server"),
          root: join(BUILD_FOLDER)
        })],
        splitting: true,
        target: "bun"
      });

      // make sure to cleanup!
      await entry.delete();

      // show some information for the console...
      for (const bundle of bundles.outputs) {
        console.log(
          relative(PROJECT_PATH, bundle.path),
          `(${bundle.size} bytes)`
        );
      }

      console.log(`✓ built in ${Date.now() - now}ms\n`);
    },

    name: "@satone/elysia",

    /**
     * - Removes unused imports
     * - Prunes the `export const server` variable which contains API
     *   source code and should not be distributed to front-end.
     */
    transform(code, id) {
      // Make sure we're only transforming files inside routes.
      if (!id.startsWith(ROUTES_PATH)) return;

      const ast = parse(code, {
        plugins: ["typescript", "jsx"],
        sourceType: "module"
      });

      cleanServerExport(ast);
      pruneUnusedImports(ast);

      const output = generate(ast, { retainLines: false }, code);

      return {
        code: output.code
      };
    }
  };
};
