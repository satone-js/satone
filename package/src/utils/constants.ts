import { Glob } from "bun";
import { join } from "node:path";

export const GLOB = new Glob("**/*.ts[x]");
export const ROUTES_PATH = join(process.cwd(), "src/routes");
export const CACHE_FOLDER = join(process.cwd(), "node_modules", ".satone");
export const SERVER_FOLDER = join(CACHE_FOLDER, "server");
export const BUILD_FOLDER = join(process.cwd(), ".satone");
