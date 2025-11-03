import { A } from "@solidjs/router";
import { t } from "elysia";
import { client } from "satone/client";
import { api } from "satone/server";
import { createResource, createSignal, Suspense, type VoidComponent } from "solid-js";
import { something } from "../utils/something";

export const server = api((app, path) =>
  app.post(path, ({ body }) => something(body.name) as string, {
    body: t.Object({
      name: t.String()
    })
  })
);

const View: VoidComponent = () => {
  const [name, setName] = createSignal("");
  const [hello] = createResource(name, (name) =>
    client.abcd.post({
      name
    })
  );

  return (
    <div>
      <h1>Hello World, this is the /abcd page</h1>
      <p>Yes, this is rendered as SolidJS!</p>
      <A href="/">Go to /</A>

      <div>
        <input
          onInput={(event) => setName(event.currentTarget.value)}
          placeholder="Your Name"
          type="text"
          value={name()}
        />

        <Suspense fallback={<p>loading...</p>}>
          <p>
            API value:
            {hello()?.data}
          </p>
        </Suspense>
      </div>
    </div>
  );
};

export default View;
