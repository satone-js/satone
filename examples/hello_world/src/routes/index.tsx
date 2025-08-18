import { api } from "satone";

export const server = api((app, path) => app.get(path, () => "hel lo world!"));
