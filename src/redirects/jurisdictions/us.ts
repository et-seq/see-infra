import { defineJurisdictionSegment } from "../types";

export const us = {
  root: defineJurisdictionSegment(
    "us",
    ["usa", "u.s.", "united-states"],
    "United States",
  ),
  ca: defineJurisdictionSegment("ca", ["cal", "california"], "California"),
} as const;
