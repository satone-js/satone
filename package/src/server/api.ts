import Elysia from "elysia";

export const api = <T extends Elysia>(cb: (app: Elysia, path: "") => T): T => {
  const app = new Elysia();
  cb(app, "");
  return app as T;
};
