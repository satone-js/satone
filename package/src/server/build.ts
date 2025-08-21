import { build } from "vite";
import { elysia } from "../plugins/elysia";
import { router } from "../plugins/router";
import solid from "vite-plugin-solid";
import { setServerState } from "./state";
import { reload } from "./reload";

export const createBuild = async () => {
  // Let's create a dummy Elysia server and grab the routes state.
  setServerState(await reload());

  await build({
    plugins: [elysia(), router(), solid({ ssr: false })],
  });
};
