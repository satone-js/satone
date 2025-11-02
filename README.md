# Satone

A highly work in progress SPA fullstack framework.

## Features

- Vite under the hood, SolidJS for the frontend and Elysia for the backend
- Write both your API route and View in a single route file
- Automatically generated Eden client for calling the API
- SPA only, views will never be server rendered
- Hot reload for both environments
- File routing

## Example

```tsx
// /src/routes/hello.tsx
import { createResource, createSignal, Suspense } from "solid-js";
import { client } from "satone/client";
import { api } from "satone/server";
import { t } from "elysia";

// This is your API route, defined through `elysia` internally.
export const server = api((app, path) =>
  // We're defining a POST method for `/hello` route,
  // see Elysia's documentation to know what this means.
  app.post(
    path,
    ({ body }) => {
      return `Hello, ${body.name} !`;
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )
);

// This is your UI route, defined through `@solidjs/router` internally.
export default function View() {
  const [name, setName] = createSignal("");

  const [hello] = createResource(name, (name) =>
    // Automatically generated Eden client depending on the `server` type.
    client.hello.post({
      name, // Will show an error if it was `t.Number()`, for example.
    })
  );

  return (
    <div>
      <h1>Say Hello</h1>

      <input
        type="text"
        value={name()}
        onInput={(event) => setName(event.currentTarget.value)}
      />

      <Suspense fallback={<p>Loading...</p>}>
        <p>API value: {hello()?.data}</p>
      </Suspense>
    </div>
  );
}
```

## CLI

You can use the CLI by running `bunx satone`.

### `dev`

Will run a development server on your port `3000`.
Hot reload will be triggered on file changes.

### `satone build`

Will bundle your app into the `.satone` directory at the root of your
project.

- `.satone/server` is the Elysia server bundle
- `.satone/client` is the SolidJS bundle, deployed through the server with a static plugin

If you want to preview the output locally, you can run `bun run .satone/server/index.js`
and Bun will start the production server on port `3000`.

## Contributing

```sh
git clone https://github.com/satone-js/satone && cd satone
bun install
```

You can use run demo apps in the `examples` directory and every changes
you do to Satone (`/package`) will be replicated to those examples.
