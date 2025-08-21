import { Elysia } from "elysia";
import { dirname, join, relative, resolve, sep } from "node:path";
import swagger from "@elysiajs/swagger";
import {
  CACHE_FOLDER,
  GLOB,
  ROUTES_PATH,
  SERVER_FOLDER,
} from "../utils/constants";
import { generateTypes } from "../generator/types";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  cleanViewExport,
  containsServerExport,
  containsViewExport,
  getAST,
} from "../utils/ast";
import { build } from "bun";
import generate from "@babel/generator";
import traverse from "@babel/traverse";

/**
 * Read every routes and create an Elysia instance
 * out of them.
 *
 * Also looks up if these routes should be handled by
 * SolidJS or not.
 */
export const reload = async () => {
  await generateTypes();
  await mkdir(SERVER_FOLDER, { recursive: true });

  const renderables = new Set();
  const serverPaths: string[] = [];

  let elysia = new Elysia().use(swagger());

  for await (const file of GLOB.scan(ROUTES_PATH)) {
    const path = join(ROUTES_PATH, file);

    const code = await readFile(path, "utf8");
    const ast = getAST(code);

    const hasView = containsViewExport(ast);

    if (hasView) {
      const route = file.replace("index", "/").replace(/\.ts[x]/, "");
      renderables.add(route);
    }

    if (containsServerExport(ast)) {
      if (hasView) cleanViewExport(ast);

      traverse(ast, {
        ImportDeclaration(p) {
          let source = p.node.source.value;

          if (source.startsWith(".") || source.startsWith("..")) {
            // read absolute path.
            const absPath = resolve(dirname(path), source);

            // rebase it relative to server folder.
            let newPath = relative(SERVER_FOLDER, absPath);

            // convert windows backslashes to POSIX-style.
            newPath = newPath.split(sep).join("/");

            // update the value.
            p.node.source.value = newPath;
          }
        },
      });

      const { code } = generate(ast);
      const serverPath = join(SERVER_FOLDER, file);
      await writeFile(serverPath, code, "utf8");

      serverPaths.push(serverPath);
      // await build({

      //   outdir: join(CACHE_FOLDER, "server"),
      //   packages: "external",
      // });

      // const imported =
      // const plugin = imports.server as Elysia;
      // const route = "/" + file.replace("index", "").replace(/\.ts[x]/, "");
      // elysia = elysia.group(route, (app) => app.use(plugin));
    }
  }

  if (serverPaths.length > 0) {
    const { outputs } = await build({
      entrypoints: serverPaths,
      outdir: SERVER_FOLDER,
      packages: "external",
      external: ["*"],
    });

    for (const output of outputs) {
      // hello.js
      let route = relative(SERVER_FOLDER, output.path);

      // hello
      route = route.replace(/\.js$/, "");

      // trailing index
      route = route.replace(/index$/, "");

      route = "/" + route;

      const { server: plugin } = await import(output.path);
      elysia = elysia.group(route, (app) => app.use(plugin));
    }
  }

  return { elysia, renderables };
};
