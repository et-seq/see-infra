import type { JurisdictionDefinition } from "./types";

interface JurisdictionMatcher {
  readonly definition: JurisdictionDefinition;
  readonly children: ReadonlyMap<string, JurisdictionMatcher>;
}

// Jurisdiction metadata is intentionally separate from redirect registration.
// Adding a destination only requires a destination file; this file is only for
// jurisdiction labels that need to exist before concrete redirect targets are
// added.
export const jurisdictions = [
  {
    slug: "us",
    name: "United States",
    aliases: ["usa", "united-states"],
    children: [
      {
        slug: "ca",
        name: "California",
        aliases: ["cal", "california"],
      },
    ],
  },
  {
    slug: "aus",
    name: "Australia",
    aliases: ["au", "australia"],
    children: [
      {
        slug: "vic",
        name: "Victoria",
        aliases: ["victoria"],
      },
    ],
  },
] as const satisfies readonly JurisdictionDefinition[];

const jurisdictionLookup = buildJurisdictionLookup(jurisdictions, "root");

export function canonicalizeJurisdictionSegments(
  segments: readonly string[],
): readonly string[] {
  const normalizedSegments = segments.map(normalizeJurisdictionSlug);
  const canonicalSegments: string[] = [];
  let currentLookup: ReadonlyMap<string, JurisdictionMatcher> =
    jurisdictionLookup;

  for (let index = 0; index < normalizedSegments.length; index += 1) {
    const segment = normalizedSegments[index];
    const jurisdiction = currentLookup.get(segment);

    if (!jurisdiction) {
      canonicalSegments.push(...normalizedSegments.slice(index));
      return canonicalSegments;
    }

    canonicalSegments.push(jurisdiction.definition.slug);
    currentLookup = jurisdiction.children;
  }

  return canonicalSegments;
}

function buildJurisdictionLookup(
  definitions: readonly JurisdictionDefinition[],
  scope: string,
): ReadonlyMap<string, JurisdictionMatcher> {
  const lookup = new Map<string, JurisdictionMatcher>();

  for (const definition of definitions) {
    const matcher: JurisdictionMatcher = {
      definition: {
        ...definition,
        slug: normalizeJurisdictionSlug(definition.slug),
        aliases: definition.aliases?.map(normalizeJurisdictionSlug),
      },
      children: buildJurisdictionLookup(
        definition.children ?? [],
        `${scope}/${definition.slug}`,
      ),
    };

    for (const slug of [
      matcher.definition.slug,
      ...(matcher.definition.aliases ?? []),
    ]) {
      const existing = lookup.get(slug);

      if (existing) {
        throw new Error(
          `Duplicate jurisdiction slug "${slug}" in "${scope}" for "${matcher.definition.name}" and "${existing.definition.name}"`,
        );
      }

      lookup.set(slug, matcher);
    }
  }

  return lookup;
}

function normalizeJurisdictionSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
