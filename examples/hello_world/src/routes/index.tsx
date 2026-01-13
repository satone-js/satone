import type { VoidComponent } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "satone/server";

export const server = api((app, path) => app.post(path, () => {
  return { ok: true };
}));

const View: VoidComponent = () => {
  return (
    <p>
      <A href="/abcd">Go to /abcd</A>
    </p>
  );
};

export default View;
