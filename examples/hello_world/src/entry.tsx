/* @refresh reload */
import { FileRoutes } from "satone/client";
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Suspense } from "solid-js";

render(() => {
  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}, document.getElementById("root") as HTMLElement);
