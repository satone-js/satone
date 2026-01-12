import { build } from "vite";
import solid from "vite-plugin-solid";
import tsconfig from "vite-tsconfig-paths";
import { loadConfig } from "../config/load";
import { elysia } from "../plugins/elysia";
import { router } from "../plugins/router";
import { PROJECT_PATH } from "../utils/constants";
import { reload } from "./reload";
import { setServerState } from "./state";

// eslint-disable-next-line ts/explicit-function-return-type
export const createBuild = async () => {
  // Let's create a dummy Elysia server and grab the routes state.
  setServerState(await reload());

  const config = await loadConfig();

  await build({
    plugins: [
      ...(config?.plugins ?? []),
      tsconfig({ root: PROJECT_PATH }), elysia(), router(), solid()
    ]
  });
};
