import type { VoidComponent } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "satone/server";

export const server = api((app, path) => app.get(path, () => "hel lo world!"));

const View: VoidComponent = () => {
  return (
    <p>
      <A href="/abcd">Go to /abcd</A>
    </p>
  );
};

export default View;
