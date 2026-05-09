import { defineJurisdictionSegment } from "../types";

export const aus = {
  root: defineJurisdictionSegment("aus", ["au", "australia"]),
  vic: defineJurisdictionSegment("vic", ["victoria"]),
} as const;
