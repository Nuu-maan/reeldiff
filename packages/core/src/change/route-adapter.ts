export type RouteAdapter = {
  name: string;
  routeFor(file: string): string | null;
};
