import { join } from "node:path";
import { Glob } from "bun";

export const PROJECT_PATH = process.cwd();
export const GLOB = new Glob("**/*.{ts,tsx}");
export const ROUTES_PATH = join(PROJECT_PATH, "src/routes");
export const CACHE_FOLDER = join(PROJECT_PATH, "node_modules", ".satone");
export const SERVER_FOLDER = join(CACHE_FOLDER, "server");
export const BUILD_FOLDER = join(PROJECT_PATH, ".satone");

export const CONFIG_FILE_NAME = "satone.config.ts";
export const CONFIG_PATH = join(PROJECT_PATH, CONFIG_FILE_NAME);
export const CONFIG_FILE = Bun.file(CONFIG_PATH);
