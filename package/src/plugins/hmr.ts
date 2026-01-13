import type { Plugin } from "vite";
import type { SatoneConfig } from "../config";
import { reload } from "../server/reload";
import { setServerState, state } from "../server/state";
import { setsAreEqual } from "../utils/sets";

export const hmr = (config?: SatoneConfig): Plugin => {
  return {
    async handleHotUpdate(ctx) {
      // Keep trace of the previous rendered routes.
      const previousRenderables = state.renderables;

      // Clear the imports cache and reload Elysia.
      Loader.registry.clear();
      setServerState(await reload(config));

      // Only full reload the webpage when rendered routes changed.
      if (!setsAreEqual(state.renderables, previousRenderables)) {
        console.log(new Date(), "[hmr]: routes changed, full reloading...");

        ctx.server.hot.send({ type: "full-reload" });
        ctx.server.moduleGraph.invalidateAll();
      }
      else {
        console.log(new Date(), "[hmr]: updated");
      }
    },
    name: "@satone/hmr"
  };
};
