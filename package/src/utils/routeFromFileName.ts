export const serverRouteFromFileName = (route: string): string => {
  // hello
  route = route.replace(/\.js$/, "");

  // trailing index
  route = route.replace(/index$/, "");

  route = "/" + route;

  return route;
};
