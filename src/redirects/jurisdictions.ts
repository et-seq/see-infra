import type { JurisdictionDefinition } from "./types";

// Jurisdiction metadata is intentionally separate from redirect registration.
// Adding a destination only requires a destination file; this file is only for
// jurisdiction labels that need to exist before concrete redirect targets are
// added.
export const jurisdictions = [
  {
    slug: "us",
    name: "United States",
  },
  {
    slug: "aus",
    name: "Australia",
  },
] as const satisfies readonly JurisdictionDefinition[];
