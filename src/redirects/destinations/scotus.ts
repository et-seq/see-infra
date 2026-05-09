import { defineRedirectDestination } from "../types";
import { us } from "../jurisdictions";

const SCOTUS_URL = "https://www.supremecourt.gov/";

export default defineRedirectDestination({
  id: "scotus",
  target: SCOTUS_URL,
  description: "Supreme Court of the United States",
  routes: [
    {
      segments: ["scotus"],
      kind: "shortcut",
    },
    {
      segments: [us.root, "scotus"],
      kind: "jurisdiction",
    },
  ],
});
