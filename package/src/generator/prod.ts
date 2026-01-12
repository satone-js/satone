import { relative } from "node:path";
import { BUILD_FOLDER, SERVER_FOLDER } from "../utils/constants";
import { mapRouteNameByPath } from "./route";

export const generateProdServerFile = (paths: string[]): string => {
  let output = `import Elysia from "elysia"\n`;
  output += `import { prod } from "satone/server/plugins/prod";\n\n`;

  for (let curr = 0; curr < paths.length; curr++) {
    output += `import { server as plug${curr} } from ${JSON.stringify(
      relative(BUILD_FOLDER, paths[curr]!)
    )};\n`;
  }

  output += `\nexport default new Elysia().use(prod(import.meta.dir))`;
  for (let curr = 0; curr < paths.length; curr++) {
    output += `\n  .group(${JSON.stringify(
      mapRouteNameByPath(relative(SERVER_FOLDER, paths[curr]!))
    )}, (app) => app.use(plug${curr}))`;
  }

  output += `;`;

  return output;
};
