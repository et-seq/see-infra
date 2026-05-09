export type RedirectStatus = 301 | 302 | 307 | 308;
export type RouteKind = "shortcut" | "jurisdiction";
export type ShortcutRouteSegment = string | readonly [string, ...string[]];
export type ShortcutPathSegments = readonly [
  ShortcutRouteSegment,
  ...ShortcutRouteSegment[],
];

const jurisdictionSegmentBrand: unique symbol = Symbol("jurisdictionSegment");

export interface JurisdictionSegment {
  readonly canonical: string;
  readonly aliases: readonly string[];
  readonly [jurisdictionSegmentBrand]: true;
}

export type JurisdictionPathSegments = readonly [
  JurisdictionSegment,
  ...Array<JurisdictionSegment | string>,
];

interface BaseRouteDefinition {
  readonly status?: RedirectStatus;
  readonly preserveQuery?: boolean;
}

export interface ShortcutRouteDefinition extends BaseRouteDefinition {
  readonly segments: ShortcutPathSegments;
  readonly kind: "shortcut";
}

export interface JurisdictionRouteDefinition extends BaseRouteDefinition {
  readonly segments: JurisdictionPathSegments;
  readonly kind: "jurisdiction";
}

export type RouteDefinition =
  | ShortcutRouteDefinition
  | JurisdictionRouteDefinition;

export interface RedirectDefinition {
  readonly id: string;
  readonly target: string;
  readonly description: string;
  readonly defaultStatus?: RedirectStatus;
  readonly preserveQuery?: boolean;
  readonly routes: readonly RouteDefinition[];
}

export interface RedirectMatch {
  readonly id: string;
  readonly target: string;
  readonly targetBase: string;
  readonly targetHash: string;
  readonly targetSearch: string;
  readonly status: RedirectStatus;
  readonly preserveQuery: boolean;
  readonly segments: readonly string[];
  readonly description: string;
}

export interface ListedRedirect {
  readonly id: string;
  readonly path: string;
  readonly target: string;
  readonly status: RedirectStatus;
  readonly kind: RouteKind;
  readonly description: string;
}

export function defineJurisdictionSegment(
  canonical: string,
  aliases: readonly string[] = [],
): JurisdictionSegment {
  const normalizedCanonical = normalizeJurisdictionPart(canonical);
  const normalizedAliases = aliases
    .map(normalizeJurisdictionPart)
    .filter((alias): alias is string => Boolean(alias));

  return {
    canonical: normalizedCanonical,
    aliases: [...new Set(normalizedAliases)],
    [jurisdictionSegmentBrand]: true,
  };
}

function normalizeJurisdictionPart(part: string) {
  const normalizedPart = part.trim().toLowerCase();

  if (normalizedPart.includes("/")) {
    throw new Error("Jurisdiction segments cannot include slashes");
  }

  return normalizedPart;
}

export function defineRedirectDestination<T extends RedirectDefinition>(
  definition: T,
): T {
  return definition;
}
