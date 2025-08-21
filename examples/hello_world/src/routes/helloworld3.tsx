import { api } from "satone/server";
import { something } from "../utils/something";

export const server = api((app, path) =>
  app.get(path, () => something("sdiyufyiusdf"))
);
