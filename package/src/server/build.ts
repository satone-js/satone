import { join } from "node:path";
import { build } from "vite";
import solid from "vite-plugin-solid";
import tsconfig from "vite-tsconfig-paths";
import { loadConfig } from "../config/load";
import { elysia } from "../plugins/elysia";
import { router } from "../plugins/router";
import { BUILD_FOLDER, PROJECT_PATH } from "../utils/constants";
import { reload } from "./reload";
import { setServerState } from "./state";

export const createBuild = async (): Promise<void> => {
  // Let's create a dummy Elysia server and grab the routes state.
  setServerState(await reload());

  const config = await loadConfig();

  await build({
    build: {
      copyPublicDir: true,
      emptyOutDir: true,
      outDir: join(BUILD_FOLDER, "client")
    },
    define: config?.define,
    plugins: [
      ...(config?.plugins ?? []),
      tsconfig({ root: PROJECT_PATH }), elysia(), router(), solid()
    ],
    publicDir: join(PROJECT_PATH, "public")
  });
};
