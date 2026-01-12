import type { JSX, VoidComponent } from "solid-js";
import { useParams } from "@solidjs/router";
import { api } from "satone/server";

export const server = api((app, path) =>
  app.post(path, ({ body, params }) => ({ body, params })));

const View: VoidComponent = () => {
  const params = useParams();
  return (
    <div>
      {JSON.stringify(params)}
    </div>
  );
};

export default View;
