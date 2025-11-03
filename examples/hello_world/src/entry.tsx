/* @refresh reload */
import { Router } from "@solidjs/router";
import { FileRoutes } from "satone/client";
import { Suspense } from "solid-js";
import { render } from "solid-js/web";

render(() => {
  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}, document.getElementById("root") as HTMLElement);
