import { Elysia } from "elysia";
import { join } from "node:path";
import swagger from "@elysiajs/swagger";
import { GLOB, ROUTES_PATH } from "../utils/constants";
import { generateTypes } from "../generator/types";

/**
 * Read every routes and create an Elysia instance
 * out of them.
 *
 * Also looks up if these routes should be handled by
 * SolidJS or not.
 */
export const reload = async () => {
  await generateTypes();

  const renderables = new Set();
  let elysia = new Elysia().use(swagger());

  for await (const file of GLOB.scan(ROUTES_PATH)) {
    const path = join(ROUTES_PATH, file);
    const imports = await import(path);

    if (imports.server) {
      const plugin = imports.server as Elysia;
      const route = "/" + file.replace("index", "").replace(/\.ts[x]/, "");
      elysia = elysia.group(route, (app) => app.use(plugin));
    }

    if (imports.default) {
      const route = file.replace("index", "/").replace(/\.ts[x]/, "");
      renderables.add(route);
    }
  }

  return { elysia, renderables };
};
