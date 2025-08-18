import { createServer } from "vite";
import { hmr } from "../plugins/hmr";
import { elysia } from "../plugins/elysia";
import { router } from "../plugins/router";
import solid from "vite-plugin-solid";

export const createDevServer = async () => {
  console.log(new Date(), "[vite]: http://localhost:3000");

  const vite = await createServer({
    plugins: [hmr(), elysia(), router(), solid()],
    clearScreen: false,
    logLevel: "silent",
  });

  await vite.listen(3000);

  return vite;
};
