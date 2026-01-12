import { sep } from "node:path";

export const dynamicRouteRE = /^\[(.+)\]$/;
export const cacheAllRouteRE = /^\[\.{3}(.*)\]$/;
export const replaceDynamicRouteRE = /^\[(?:\.{3})?(.*)\]$/;

export const isCatchAllRoute = (routePath: string): boolean => {
  return cacheAllRouteRE.test(routePath);
};

export const isDynamicRoute = (routePath: string): boolean => {
  return dynamicRouteRE.test(routePath);
};

export const normalizeName = (name: string, isDynamic: boolean): string => {
  if (!isDynamic) return name;
  return name.replace(replaceDynamicRouteRE, "$1");
};

export const mapRouteNameByPath = (path: string): string => {
  if (path[0] === "/") {
    path = path.substring(1);
  }

  path = path.replace(/\.(?:[jt]sx?)$/, "");

  const nodes: Array<string> = [];
  for (const node of path.split(sep)) {
    const isDynamic = isDynamicRoute(node);
    const isCatchAll = isCatchAllRoute(node);
    const normalizedName = normalizeName(node, isDynamic);

    if (isDynamic) {
      if (isCatchAll)
        nodes.push("*");
      else
        nodes.push(`:${normalizedName}`);
    }
    else {
      if (normalizedName !== "index")
        nodes.push(normalizedName);
    }
  }

  return "/" + nodes.join("/");
};
