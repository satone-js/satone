import type { Plugin } from "vite";
import type { SatoneConfig } from "../config";
import { watch } from "node:fs";
import pages from "vite-plugin-pages";
import { reload } from "../server/reload";
import { setServerState, state } from "../server/state";
import { ROUTES_PATH } from "../utils/constants";

export const router = (config?: SatoneConfig): Plugin[] => {
  return [
    pages({
      dirs: [ROUTES_PATH],
      async onRoutesGenerated(routes) {
        interface Route {
          children?: Array<Route>;
          path: string;
        }

        const recursive = (initial: string, routes: Array<Route>): Array<Route> => {
          return routes.filter(({ children, path }) => {
            path = path.replace("/", "");
            path = [initial, path].join("/");

            if (state.renderables.has(path)) {
              return true;
            }

            if (children) return recursive(path, children);
            else return false;
          });
        };

        const total = recursive("", routes);
        return total;
      }
    }),
    {
      async configureServer() {
        const process = async (): Promise<void> => setServerState(await reload(config));

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
