#!/usr/bin/env bun
import { watch } from "node:fs";
import { join } from "node:path";
import { generateVercelBuildOutput } from "./generator/presets/vercel";
import { CONFIG_FILE, CONFIG_PATH, PROJECT_PATH } from "./utils/constants";
const [, , command] = Bun.argv;

if (!command) {
  console.log("Welcome to Satone CLI.");
  console.log("- satone build: builds your app for production");
  console.log("- satone dev: runs a devlopment server with hot reload");
  process.exit(0);
}

switch (command) {
  case "build": {
    const { createBuild } = await import("./server/build");
    await createBuild();

    // Let's create a bundle for Vercel deployments.
    // TODO: move this into a configuration
    await generateVercelBuildOutput();

    break;
  }
  case "dev": {
    const { createDevServer } = await import("./server/dev");

    let vite = await createDevServer();
    const watcher = watch(PROJECT_PATH, async (_, filename) => {
      if (!filename) return;

      const path = join(PROJECT_PATH, filename);
      if (path !== CONFIG_PATH) return;

      console.log(new Date(), "[vite]: restarting due to changes in the config file...");
      vite.httpServer?.close();
      vite.close();

      Loader.registry.clear();
      vite = await createDevServer();
    });

    process.on("SIGINT", () => {
      console.log(new Date(), "[vite]: closing...");
      watcher.close();
      vite.close();

      process.exit(0);
    });

    break;
  }
}
