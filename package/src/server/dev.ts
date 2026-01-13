import { createServer, type ViteDevServer } from "vite";
import solid from "vite-plugin-solid";
import tsconfig from "vite-tsconfig-paths";
import { loadConfig } from "../config/load";
import { elysia } from "../plugins/elysia";
import { hmr } from "../plugins/hmr";
import { router } from "../plugins/router";
import { PROJECT_PATH } from "../utils/constants";

export const createDevServer = async (): Promise<ViteDevServer> => {
  console.log(new Date(), "[vite]: http://localhost:3000");
  const config = await loadConfig();

  const vite = await createServer({
    clearScreen: false,
    define: config?.define,
    logLevel: "silent",
    optimizeDeps: { exclude: ["satone"] },
    plugins: [
      ...(config?.plugins ?? []),
      tsconfig({ root: PROJECT_PATH }), hmr(config), elysia(config), router(config), solid()
    ]
  });

  await vite.listen(3000);

  return vite;
};
