import { defineJurisdictionSegment } from "../types";

export const aus = {
  root: defineJurisdictionSegment("aus", ["au", "australia"], "Australia"),
  vic: defineJurisdictionSegment("vic", ["victoria"], "Victoria"),
} as const;
