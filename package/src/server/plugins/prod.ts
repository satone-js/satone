import path from "node:path";
import { staticPlugin } from "@elysiajs/static";
import Elysia from "elysia";

// eslint-disable-next-line ts/explicit-function-return-type
export const prod = (serverDirectory: string) => {
  const FRONTEND_DIRECTORY = path.join(serverDirectory, "..", "client");
  const FRONTEND_ENTRYPOINT = path.join(FRONTEND_DIRECTORY, "index.html");

  return new Elysia({ name: "@satone/production" })
    .use(
      staticPlugin({
        assets: FRONTEND_DIRECTORY,
        prefix: "/"
      })
    )
    .onError(({ code }) => {
      if (code === "NOT_FOUND") return Bun.file(FRONTEND_ENTRYPOINT);
    });
};
