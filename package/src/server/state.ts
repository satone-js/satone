import type { reload } from "./reload";

export const state = {
  /** Empty when the server starts, waiting for first reload! */
} as Awaited<ReturnType<typeof reload>>;

export const setServerState = (value: typeof state): void => {
  state.elysia = value.elysia;
  state.renderables = value.renderables;
  state.executables = value.executables;
};
