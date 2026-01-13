import type { SatoneConfig } from "../config";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import openapi from "@elysiajs/openapi";
import { build } from "bun";
import { type AnyElysia, Elysia } from "elysia";
import { mapRouteNameByPath, removeFileExtension } from "../generator/route";
import { generateTypes } from "../generator/types";
import {
  cleanViewExport,
  containsServerExport,
  containsViewExport,
  getAST,
  pruneUnusedImports
} from "../utils/ast";
import { GLOB, ROUTES_PATH, SERVER_FOLDER } from "../utils/constants";

export type Executable = [path: string, pattern: URLPattern, bundle: string];

/**
 * Read every routes and create an Elysia instance
 * out of them.
 *
 * Also looks up if these routes should be handled by
 * SolidJS or not.
 */
export const reload = async (config?: SatoneConfig): Promise<{
  elysia: AnyElysia;
  executables: Array<Executable>;
  renderables: Set<string>;
}> => {
  await generateTypes();

  await rm(SERVER_FOLDER, { force: true, recursive: true });
  await mkdir(SERVER_FOLDER, { recursive: true });

  const renderables = new Set<string>();
  const server: Array<string> = [];

  let elysia = new Elysia();

  if (config?.swagger) {
    elysia = elysia.use(openapi({
      path: config.swagger.path,
      specPath: "/" + config.swagger.path + "/json"
    }));
  }

  for await (const file of GLOB.scan(ROUTES_PATH)) {
    const path = join(ROUTES_PATH, file);

    const code = await readFile(path, "utf8");
    const ast = getAST(code);

    const hasView = containsViewExport(ast);

    if (hasView) {
      renderables.add(mapRouteNameByPath(file));
    }

    if (containsServerExport(ast)) {
      if (hasView) cleanViewExport(ast);
      pruneUnusedImports(ast);

      traverse(ast, {
        ImportDeclaration(p) {
          const source = p.node.source.value;

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
        }
      });

      const { code } = generate(ast);
      await Bun.write(join(SERVER_FOLDER, file), code);
      server.push(file);
    }
  }

  const executables = new Array<Executable>();
  if (server.length > 0) {
    const { outputs } = await build({
      entrypoints: server.map((file) => join(SERVER_FOLDER, file)),
      external: ["*"],
      outdir: SERVER_FOLDER,
      packages: "external"
    });

    for (let index = 0; index < outputs.length; index++) {
      const output = outputs[index]!;
      const file = removeFileExtension(server[index]!);

      const route = mapRouteNameByPath(file);
      const { server: plugin } = await import(output.path);
      executables.push([route, new URLPattern({ pathname: route }), output.path]);

      elysia = elysia.group(
        route,
        (app) => app.use(plugin)
      );
    }
  }

  return { elysia, executables, renderables };
};
