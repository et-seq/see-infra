import { defineJurisdictionSegment } from "../types";

export const canada = {
  root: defineJurisdictionSegment("canada", ["can"]),
} as const;
