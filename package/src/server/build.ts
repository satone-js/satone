import { build } from "vite";
import solid from "vite-plugin-solid";
import { elysia } from "../plugins/elysia";
import { router } from "../plugins/router";
import { reload } from "./reload";
import { setServerState } from "./state";

// eslint-disable-next-line ts/explicit-function-return-type
export const createBuild = async () => {
  // Let's create a dummy Elysia server and grab the routes state.
  setServerState(await reload());

  await build({
    plugins: [elysia(), router(), solid({ ssr: false })]
  });
};
