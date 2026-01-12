import { createServer, type ViteDevServer } from "vite";
import solid from "vite-plugin-solid";
import tsconfig from "vite-tsconfig-paths";
import { elysia } from "../plugins/elysia";
import { hmr } from "../plugins/hmr";
import { router } from "../plugins/router";

export const createDevServer = async (): Promise<ViteDevServer> => {
  console.log(new Date(), "[vite]: http://localhost:3000");

  const vite = await createServer({
    clearScreen: false,
    logLevel: "silent",
    optimizeDeps: { exclude: ["satone"] },
    plugins: [tsconfig({ root: process.cwd() }), hmr(), elysia(), router(), solid()]
  });

  await vite.listen(3000);

  return vite;
};
