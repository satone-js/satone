import { relative } from "node:path";
import { BUILD_FOLDER, SERVER_FOLDER } from "../utils/constants";
import { serverRouteFromFileName } from "../utils/routeFromFileName";

export const generateProdServerFile = (paths: string[]): string => {
  let output = `import Elysia from "elysia"\n`;
  output += `import { prod } from "satone/server/plugins/prod";\n\n`;

  for (let curr = 0; curr < paths.length; curr++) {
    output += `import { server as plug${curr} } from ${JSON.stringify(
      relative(BUILD_FOLDER, paths[curr]!)
    )};\n`;
  }

  output += `\nnew Elysia().use(prod)`;
  for (let curr = 0; curr < paths.length; curr++) {
    output += `\n  .group(${JSON.stringify(
      serverRouteFromFileName(relative(SERVER_FOLDER, paths[curr]!))
    )}, (app) => app.use(plug${curr}))`;
  }

  output += `\n  .listen(3000, () => console.log("Running on port http://localhost:3000"));`;

  return output;
};
