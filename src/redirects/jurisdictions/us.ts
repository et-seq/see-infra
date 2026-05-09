import { defineJurisdictionSegment } from "../types";

export const us = {
  root: defineJurisdictionSegment("us", ["usa", "u.s.", "united-states"]),
  ca: defineJurisdictionSegment("ca", ["cal", "california"]),
} as const;
