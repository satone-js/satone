import { join } from "node:path";
import { BUILD_FOLDER } from "../../utils/constants";
import { cp, mkdir, rm } from "node:fs/promises";

const FALLBACK_ROUTE = "__server";
const VERCEL_OUTPUT = join(process.cwd(), ".vercel", "output");
const FUNCTION = join(VERCEL_OUTPUT, "functions", FALLBACK_ROUTE + ".func");

export const generateVercelBuildOutput = async () => {
  await rm(VERCEL_OUTPUT, { force: true, recursive: true });

  await Bun.write(
    join(VERCEL_OUTPUT, "config.json"),
    JSON.stringify({
      version: 3,
      routes: [
        {
          src: "/(.*)",
          dest: "/__server",
        },
      ],
    })
  );

  await Bun.write(
    join(FUNCTION, ".vc-config.json"),
    JSON.stringify({
      runtime: "bun1.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
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
    recursive: true,
  });

  await cp(join(BUILD_FOLDER, "server"), join(FUNCTION, "server"), {
    recursive: true,
  });
};
