#!/usr/bin/env bun
//! This file is the entrypoint for the `satone` CLI, defined in `package.json`.

const [, , command] = Bun.argv;

if (!command) {
  console.log("Welcome to Satone CLI.");
  console.log("- satone build: builds your app for production");
  console.log("- satone dev: runs a devlopment server with hot reload");
  process.exit(0);
}

switch (command) {
  case "dev": {
    const { createDevServer } = await import("./server/dev");
    await createDevServer();
    break;
  }
  case "build": {
    const { createBuild } = await import("./server/build");
    await createBuild();
    break;
  }
}
