import { defineJurisdictionSegment } from "../types";

export const canada = {
  root: defineJurisdictionSegment("canada", ["can"], "Canada"),
} as const;
