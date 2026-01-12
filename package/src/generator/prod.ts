import { state } from "../server/state";

export const generateProdServerFile = (): string => {
  let output = `import Elysia from "elysia"\n`;
  output += `import { prod } from "satone/server/plugins/prod";\n\n`;

  for (let curr = 0; curr < state.executables.length; curr++) {
    const [,, bundle] = state.executables[curr]!;

    output += `import { server as plug${curr} } from ${JSON.stringify(
      bundle
    )};\n`;
  }

  output += `\nexport default new Elysia().use(prod(import.meta.dir))`;
  for (let curr = 0; curr < state.executables.length; curr++) {
    const [path] = state.executables[curr]!;

    output += `\n  .group(${JSON.stringify(
      path
    )}, (app) => app.use(plug${curr}))`;
  }

  return output;
};
