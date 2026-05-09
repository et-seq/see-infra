export {
  createRedirectIndex,
  jurisdictionRouteKeyFromPathname,
  listRedirects,
  resolveRedirect,
  routeKeyFromPathname,
} from "./resolver";
export {
  canonicalizeJurisdictionSegments,
  jurisdictions,
} from "./jurisdictions";
export { defineRedirectDestination } from "./types";
export type { RedirectIndex } from "./resolver";
export type {
  JurisdictionDefinition,
  ListedRedirect,
  RedirectDefinition,
  RedirectMatch,
  RedirectStatus,
  RouteDefinition,
  RouteKind,
} from "./types";
