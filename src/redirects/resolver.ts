import { redirectDefinitions } from "./destinations";
import type {
  ListedRedirect,
  RedirectDefinition,
  RedirectMatch,
  RedirectStatus,
  RouteDefinition,
  RouteSegment,
} from "./types";

const DEFAULT_REDIRECT_STATUS: RedirectStatus = 302;
const REDIRECT_STATUSES = new Set<number>([301, 302, 307, 308]);
const ROUTE_SEPARATOR = "/";

interface IndexedRedirect {
  readonly id: string;
  readonly target: string;
  readonly targetBase: string;
  readonly targetHash: string;
  readonly targetSearch: string;
  readonly status: RedirectStatus;
  readonly preserveQuery: boolean;
  readonly segments: readonly string[];
  readonly description: string;
  readonly kind: RouteDefinition["kind"];
}

interface BuiltRedirectIndex {
  readonly routeIndex: ReadonlyMap<string, IndexedRedirect>;
  readonly listedRedirects: readonly ListedRedirect[];
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
  const { routeIndex, listedRedirects } = buildRouteIndex(definitions);

  return {
    resolve(pathname) {
      const match = routeIndex.get(routeKeyFromPathname(pathname));

      if (!match) {
        return undefined;
      }

      return {
        id: match.id,
        target: match.target,
        targetBase: match.targetBase,
        targetHash: match.targetHash,
        targetSearch: match.targetSearch,
        status: match.status,
        preserveQuery: match.preserveQuery,
        segments: match.segments,
        description: match.description,
      };
    },
    list() {
      return listedRedirects;
    },
  };
}

export function routeKeyFromPathname(pathname: string): string {
  return routeKeyFromSegments(normalizeSegments(pathname));
}

function buildRouteIndex(
  definitions: readonly RedirectDefinition[],
): BuiltRedirectIndex {
  const index = new Map<string, IndexedRedirect>();
  const listedRedirects: ListedRedirect[] = [];
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

      const { canonicalSegments, indexedSegmentSets } = normalizeRouteSegments(
        route.segments,
      );
      const canonicalRouteKey = routeKeyFromSegments(canonicalSegments);

      if (!canonicalRouteKey) {
        throw new Error(
          `Redirect route in "${definition.id}" must contain at least one non-empty segment`,
        );
      }

      const indexedRedirect: IndexedRedirect = {
        id: normalizedId,
        target: target.href,
        targetBase: target.base,
        targetHash: target.hash,
        targetSearch: target.search,
        status,
        preserveQuery:
          route.preserveQuery ?? definition.preserveQuery ?? true,
        segments: canonicalSegments,
        description: definition.description,
        kind: route.kind,
      };

      for (const indexedSegments of indexedSegmentSets) {
        const routeKey = routeKeyFromSegments(indexedSegments);
        const existingRoute = index.get(routeKey);

        if (existingRoute) {
          throw new Error(
            `Duplicate redirect route "/${routeKey}" in "${definition.id}" and "${existingRoute.id}"`,
          );
        }

        index.set(routeKey, indexedRedirect);
      }

      listedRedirects.push({
        id: indexedRedirect.id,
        path: `/${canonicalSegments.join(ROUTE_SEPARATOR)}`,
        target: indexedRedirect.target,
        status: indexedRedirect.status,
        kind: indexedRedirect.kind,
        description: indexedRedirect.description,
      });
    }
  }

  return {
    routeIndex: index,
    listedRedirects,
  };
}

function normalizeRedirectTarget(definition: RedirectDefinition) {
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

  if (target.username || target.password) {
    throw new Error(
      `Redirect target for "${definition.id}" must not include credentials`,
    );
  }

  return {
    href: target.toString(),
    base: target.origin + target.pathname,
    hash: target.hash,
    search: target.search,
  };
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

function normalizeRouteSegments(segments: readonly RouteSegment[]) {
  const canonicalSegments: string[] = [];
  let indexedSegmentSets: string[][] = [[]];

  for (const segment of segments) {
    const alternatives = normalizeSegmentAlternatives(segment);

    if (alternatives.length === 0) {
      throw new Error("Redirect route segments must be non-empty");
    }

    canonicalSegments.push(alternatives[0]);
    indexedSegmentSets = indexedSegmentSets.flatMap((indexedSegments) =>
      alternatives.map((alternative) => [...indexedSegments, alternative]),
    );
  }

  return {
    canonicalSegments,
    indexedSegmentSets: dedupeSegmentSets(indexedSegmentSets),
  };
}

function normalizeSegmentAlternatives(segment: RouteSegment) {
  const rawAlternatives = typeof segment === "string" ? [segment] : segment;
  const seen = new Set<string>();
  const alternatives: string[] = [];

  for (const rawAlternative of rawAlternatives) {
    const alternative = normalizeSegment(rawAlternative);

    if (!alternative || seen.has(alternative)) {
      continue;
    }

    seen.add(alternative);
    alternatives.push(alternative);
  }

  return alternatives;
}

function normalizeSegment(segment: string) {
  const normalizedSegment = safeDecode(segment).trim().toLowerCase();

  if (normalizedSegment.includes(ROUTE_SEPARATOR)) {
    throw new Error("Redirect route segments cannot include slashes");
  }

  return normalizedSegment;
}

function dedupeSegmentSets(segmentSets: readonly string[][]) {
  const seen = new Set<string>();
  const dedupedSegmentSets: string[][] = [];

  for (const segmentSet of segmentSets) {
    const routeKey = routeKeyFromSegments(segmentSet);

    if (seen.has(routeKey)) {
      continue;
    }

    seen.add(routeKey);
    dedupedSegmentSets.push(segmentSet);
  }

  return dedupedSegmentSets;
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
