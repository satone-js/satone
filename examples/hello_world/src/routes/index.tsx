import { A } from "@solidjs/router";
import { api } from "satone/server";

export const server = api((app, path) => app.get(path, () => "hel lo world!"));

export default function View() {
  return (
    <p>
      <A href="/abcd">Go to /abcd</A>
    </p>
  );
}
