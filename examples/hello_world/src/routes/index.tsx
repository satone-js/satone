import { api } from "satone/server";

export const server = api((app, path) => app.get(path, () => "hel lo world!"));
