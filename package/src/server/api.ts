import type { AnyElysia } from "elysia";
import { Elysia } from "elysia";

export const api = <T extends AnyElysia>(cb: (app: AnyElysia, path: "") => T): T => {
  const app = new Elysia();
  cb(app, "");
  return app as T;
};
