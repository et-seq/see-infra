import { canada } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const CIPO_TRADEMARK_SEARCH_URL =
  "https://ised-isde.canada.ca/cipo/trademark-search/srch";

export default defineRedirectDestination({
  id: "cipo-trademark-search",
  target: CIPO_TRADEMARK_SEARCH_URL,
  description: "Canadian Trademark Search",
  segmentLabels: {
    tm: "Trade Marks",
  },
  routes: [
    {
      segments: [canada.root, "tm", "search"],
      kind: "jurisdiction",
    },
  ],
});
