import pages from "vite-plugin-pages";
import type { Plugin } from "vite";
import { ROUTES_PATH } from "../utils/constants";
import { setServerState, state } from "../server/state";
import { reload } from "../server/reload";
import { watch } from "node:fs";

export const router = (): Plugin[] => {
  return [
    pages({
      dirs: [ROUTES_PATH],
      async onRoutesGenerated(routes) {
        return routes.filter(({ path }) => state.renderables.has(path));
      },
    }),
    {
      enforce: "pre",
      name: "@satone/router",
      async configureServer() {
        const process = async () => setServerState(await reload());

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
    },
  ];
};
