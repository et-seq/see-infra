import { redirectDefinitions } from "./destinations";
import { canonicalizeJurisdictionSegments } from "./jurisdictions";
import type {
  ListedRedirect,
  RedirectDefinition,
  RedirectMatch,
  RedirectStatus,
  RouteDefinition,
} from "./types";

const DEFAULT_REDIRECT_STATUS: RedirectStatus = 302;
const REDIRECT_STATUSES = new Set<number>([301, 302, 307, 308]);
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

export interface RedirectIndex {
  readonly resolve: (pathname: string) => RedirectMatch | undefined;
  readonly list: () => readonly ListedRedirect[];
}

const defaultRedirectIndex = createRedirectIndex(redirectDefinitions);

export function resolveRedirect(pathname: string): RedirectMatch | undefined {
  return defaultRedirectIndex.resolve(pathname);
}

export function listRedirects(): readonly ListedRedirect[] {
  return defaultRedirectIndex.list();
}

export function createRedirectIndex(
  definitions: readonly RedirectDefinition[],
): RedirectIndex {
  const routeIndex = buildRouteIndex(definitions);

  return {
    resolve(pathname) {
      const segments = normalizeSegments(pathname);
      const directRouteKey = routeKeyFromSegments(segments);
      const jurisdictionRouteKey = routeKeyFromSegments(
        canonicalizeJurisdictionSegments(segments),
      );
      const match =
        routeIndex.get(directRouteKey) ?? routeIndex.get(jurisdictionRouteKey);

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
    },
    list() {
      return [...routeIndex.values()].map((entry) => ({
        id: entry.id,
        path: `/${entry.segments.join(ROUTE_SEPARATOR)}`,
        target: entry.target,
        status: entry.status,
        kind: entry.kind,
        description: entry.description,
      }));
    },
  };
}

export function jurisdictionRouteKeyFromPathname(pathname: string): string {
  return routeKeyFromSegments(
    canonicalizeJurisdictionSegments(normalizeSegments(pathname)),
  );
}

export function routeKeyFromPathname(pathname: string): string {
  return routeKeyFromSegments(normalizeSegments(pathname));
}

function buildRouteIndex(
  definitions: readonly RedirectDefinition[],
): ReadonlyMap<string, IndexedRedirect> {
  const index = new Map<string, IndexedRedirect>();
  const definitionIds = new Set<string>();

  for (const definition of definitions) {
    const normalizedId = definition.id.trim();

    if (!normalizedId) {
      throw new Error("Redirect definitions must have a non-empty id");
    }

    if (definitionIds.has(normalizedId)) {
      throw new Error(`Duplicate redirect definition id "${normalizedId}"`);
    }

    definitionIds.add(normalizedId);

    const target = normalizeRedirectTarget(definition);

    if (definition.routes.length === 0) {
      throw new Error(`Redirect definition "${normalizedId}" has no routes`);
    }

    for (const route of definition.routes) {
      if (route.kind !== "shortcut" && route.kind !== "jurisdiction") {
        throw new Error(
          `Redirect route in "${normalizedId}" has unsupported kind "${String(route.kind)}"`,
        );
      }

      const status =
        route.status ?? definition.defaultStatus ?? DEFAULT_REDIRECT_STATUS;

      if (!REDIRECT_STATUSES.has(status)) {
        throw new Error(
          `Redirect route in "${normalizedId}" has unsupported status "${String(status)}"`,
        );
      }

      const normalizedSegments = normalizeSegments(route.segments);
      const segments =
        route.kind === "jurisdiction"
          ? canonicalizeJurisdictionSegments(normalizedSegments)
          : normalizedSegments;
      const routeKey = routeKeyFromSegments(segments);

      if (!routeKey) {
        throw new Error(
          `Redirect route in "${definition.id}" must contain at least one non-empty segment`,
        );
      }

      const existingRoute = index.get(routeKey);

      if (existingRoute) {
        throw new Error(
          `Duplicate redirect route "/${routeKey}" in "${definition.id}" and "${existingRoute.id}"`,
        );
      }

      index.set(routeKey, {
        id: normalizedId,
        target,
        status,
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

function normalizeRedirectTarget(definition: RedirectDefinition): string {
  let target: URL;

  try {
    target = new URL(definition.target);
  } catch {
    throw new Error(
      `Redirect target for "${definition.id}" must be an absolute URL`,
    );
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw new Error(
      `Redirect target for "${definition.id}" must use http or https`,
    );
  }

  return target.toString();
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

function routeKeyFromSegments(segments: readonly string[]): string {
  return segments.join(ROUTE_SEPARATOR);
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
