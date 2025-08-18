import { Glob } from "bun";
import { join } from "node:path";

export const GLOB = new Glob("**/*.ts[x]");
export const ROUTES_PATH = join(process.cwd(), "src/routes");
