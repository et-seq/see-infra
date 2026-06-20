import { us } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const USPTO_URL = "https://www.uspto.gov";

export default defineRedirectDestination({
  id: "uspto",
  target: USPTO_URL,
  description: "United States Patent and Trademark Office",
  segmentLabels: {
    uspto: "USPTO",
  },
  routes: [
    {
      segments: ["uspto"],
      kind: "shortcut",
    },
    {
      segments: [us.root, "uspto"],
      kind: "jurisdiction",
    },
  ],
});
