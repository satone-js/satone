import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { BUILD_FOLDER, PROJECT_PATH } from "../../utils/constants";

const FALLBACK_ROUTE = "__server";
const VERCEL_OUTPUT = join(PROJECT_PATH, ".vercel", "output");
const FUNCTION = join(VERCEL_OUTPUT, "functions", FALLBACK_ROUTE + ".func");

export const generateVercelBuildOutput = async (): Promise<void> => {
  await rm(VERCEL_OUTPUT, { force: true, recursive: true });

  await Bun.write(
    join(VERCEL_OUTPUT, "config.json"),
    JSON.stringify({
      routes: [
        {
          dest: "/__server",
          src: "/(.*)"
        }
      ],
      version: 3
    })
  );

  await Bun.write(
    join(FUNCTION, ".vc-config.json"),
    JSON.stringify({
      handler: "index.mjs",
      launcherType: "Nodejs",
      runtime: "bun1.x",
      shouldAddHelpers: false,
      supportsResponseStreaming: true
    })
  );

  await Bun.write(
    join(FUNCTION, "index.mjs"),
    `
import server from "./server/index.js";
export default server;
    `.trim()
  );

  await cp(join(BUILD_FOLDER, "client"), join(FUNCTION, "client"), {
    recursive: true
  });

  await cp(join(BUILD_FOLDER, "server"), join(FUNCTION, "server"), {
    recursive: true
  });
};
