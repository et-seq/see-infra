import { defineJurisdictionSegment } from "../types";

export const us = {
  root: defineJurisdictionSegment("us", ["usa", "united-states"]),
  ca: defineJurisdictionSegment("ca", ["cal", "california"]),
} as const;
