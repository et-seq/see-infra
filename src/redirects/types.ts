export type RedirectStatus = 301 | 302 | 307 | 308;
export type RouteKind = "shortcut" | "jurisdiction";
export type PathSegments = readonly [string, ...string[]];

export interface RouteDefinition {
  readonly segments: PathSegments;
  readonly kind: RouteKind;
  readonly status?: RedirectStatus;
  readonly preserveQuery?: boolean;
}

export interface RedirectDefinition {
  readonly id: string;
  readonly target: string;
  readonly description: string;
  readonly defaultStatus?: RedirectStatus;
  readonly preserveQuery?: boolean;
  readonly routes: readonly RouteDefinition[];
}

export interface JurisdictionDefinition {
  readonly slug: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly children?: readonly JurisdictionDefinition[];
}

export interface RedirectMatch {
  readonly id: string;
  readonly target: string;
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

export function defineRedirectDestination<T extends RedirectDefinition>(
  definition: T,
): T {
  return definition;
}
