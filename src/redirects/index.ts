export {
  createRedirectIndex,
  listRedirects,
  resolveRedirect,
  routeKeyFromPathname,
} from "./resolver";
export { aus, us } from "./jurisdictions";
export { defineRedirectDestination } from "./types";
export type { RedirectIndex } from "./resolver";
export type {
  JurisdictionPathSegments,
  JurisdictionRouteDefinition,
  JurisdictionSegment,
  ListedRedirect,
  RedirectDefinition,
  RedirectMatch,
  RedirectStatus,
  RouteDefinition,
  RouteKind,
  ShortcutRouteDefinition,
  ShortcutRouteSegment,
} from "./types";
