import type { Plugin } from "vite";
import { watch } from "node:fs";
import pages from "vite-plugin-pages";
import { reload } from "../server/reload";
import { setServerState, state } from "../server/state";
import { ROUTES_PATH } from "../utils/constants";

export const router = (): Plugin[] => {
  return [
    pages({
      dirs: [ROUTES_PATH],
      async onRoutesGenerated(routes) {
        return routes.filter(({ path }) => state.renderables.has(path));
      }
    }),
    {
      async configureServer() {
        const process = async (): Promise<void> => setServerState(await reload());

        // NOTE: we manually watch (not with chokidar) because for some
        //       reason Vite does not catch all updates...
        watch(ROUTES_PATH, { recursive: true }, async (_, file) => {
          if (!file) return;

          // Force to clear the imports cache.
          Loader.registry.clear();
          await process();
        });

        await process();
      },
      enforce: "pre",
      name: "@satone/router"
    }
  ];
};
