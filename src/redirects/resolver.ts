import { redirectDefinitions } from "./destinations";
import type {
  ListedRedirect,
  RedirectDefinition,
  RedirectMatch,
  RedirectStatus,
  RouteDefinition,
} from "./types";

const DEFAULT_REDIRECT_STATUS: RedirectStatus = 302;
const ROUTE_SEPARATOR = "/";

interface IndexedRedirect {
  readonly id: string;
  readonly target: string;
  readonly status: RedirectStatus;
  readonly preserveQuery: boolean;
  readonly segments: readonly string[];
  readonly description: string;
  readonly kind: RouteDefinition["kind"];
}

const routeIndex = buildRouteIndex(redirectDefinitions);

export function resolveRedirect(pathname: string): RedirectMatch | undefined {
  const routeKey = routeKeyFromPathname(pathname);
  const match = routeIndex.get(routeKey);

  if (!match) {
    return undefined;
  }

  return {
    id: match.id,
    target: match.target,
    status: match.status,
    preserveQuery: match.preserveQuery,
    segments: match.segments,
    description: match.description,
  };
}

export function listRedirects(): readonly ListedRedirect[] {
  return [...routeIndex.values()].map((entry) => ({
    id: entry.id,
    path: `/${entry.segments.join(ROUTE_SEPARATOR)}`,
    target: entry.target,
    status: entry.status,
    kind: entry.kind,
    description: entry.description,
  }));
}

export function routeKeyFromPathname(pathname: string): string {
  return normalizeSegments(pathname).join(ROUTE_SEPARATOR);
}

function buildRouteIndex(
  definitions: readonly RedirectDefinition[],
): ReadonlyMap<string, IndexedRedirect> {
  const index = new Map<string, IndexedRedirect>();

  for (const definition of definitions) {
    const target = new URL(definition.target).toString();

    for (const route of definition.routes) {
      const segments = normalizeSegments(route.segments);
      const routeKey = segments.join(ROUTE_SEPARATOR);
      const existingRoute = index.get(routeKey);

      if (existingRoute) {
        throw new Error(
          `Duplicate redirect route "/${routeKey}" in "${definition.id}" and "${existingRoute.id}"`,
        );
      }

      index.set(routeKey, {
        id: definition.id,
        target,
        status:
          route.status ?? definition.defaultStatus ?? DEFAULT_REDIRECT_STATUS,
        preserveQuery:
          route.preserveQuery ?? definition.preserveQuery ?? true,
        segments,
        description: definition.description,
        kind: route.kind,
      });
    }
  }

  return index;
}

function normalizeSegments(pathnameOrSegments: string | readonly string[]) {
  const rawSegments =
    typeof pathnameOrSegments === "string"
      ? pathnameOrSegments.split(ROUTE_SEPARATOR)
      : pathnameOrSegments;

  const segments = rawSegments
    .map((segment) => safeDecode(segment).trim().toLowerCase())
    .filter(Boolean);

  if (segments.some((segment) => segment.includes(ROUTE_SEPARATOR))) {
    throw new Error("Redirect route segments cannot include slashes");
  }

  return segments;
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
