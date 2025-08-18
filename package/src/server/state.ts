import { reload } from "./reload";

export let state = {
  /** Empty when the server starts, waiting for first reload! */
} as Awaited<ReturnType<typeof reload>>;

export const setServerState = (value: typeof state) => {
  state.elysia = value.elysia;
  state.renderables = value.renderables;
};
