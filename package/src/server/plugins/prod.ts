import { BUILD_FOLDER } from "../../utils/constants";
import { staticPlugin } from "@elysiajs/static";
import Elysia from "elysia";
import path from "node:path";

const FRONTEND_DIRECTORY = path.join(BUILD_FOLDER, "client");
const FRONTEND_ENTRYPOINT = path.join(FRONTEND_DIRECTORY, "index.html");

export const prod = new Elysia({ name: "@satone/production" })
  .use(
    staticPlugin({
      assets: FRONTEND_DIRECTORY,
      prefix: "/",
    })
  )
  .onError(({ code }) => {
    if (code === "NOT_FOUND") return Bun.file(FRONTEND_ENTRYPOINT);
  });
