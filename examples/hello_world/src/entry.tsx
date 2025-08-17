/* @refresh reload */
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { Suspense } from "solid-js";
import routes from "~solid-pages";

render(() => {
  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      {routes}
    </Router>
  );
}, document.getElementById("root") as HTMLElement);
