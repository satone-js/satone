import { createResource, createSignal, Suspense } from "solid-js";
import { api, client } from "satone";
import { t } from "elysia";

export const server = api((app, path) =>
  app.post(path, ({ body }) => `Hello, ${body.name}`, {
    body: t.Object({
      name: t.String(),
    }),
  })
);

export default function View() {
  const [name, setName] = createSignal("");
  const [hello] = createResource(name, (name) =>
    client.abcd.post({
      name,
    })
  );

  return (
    <div>
      <h1>Hello World, this is the /abcd page</h1>
      <p>Yes, this is rendered as SolidJS!</p>

      <div>
        <input
          type="text"
          placeholder="Your Name"
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
        />

        <Suspense fallback={<p>loading...</p>}>
          <p>API value: {hello()?.data}</p>
        </Suspense>
      </div>
    </div>
  );
}
