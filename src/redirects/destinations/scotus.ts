import { defineRedirectDestination } from "../types";

const SCOTUS_URL = "https://www.supremecourt.gov/";

export const scotusDestination = defineRedirectDestination({
  id: "scotus",
  target: SCOTUS_URL,
  description: "Supreme Court of the United States",
  routes: [
    {
      segments: ["scotus"],
      kind: "shortcut",
    },
    {
      segments: ["us", "scotus"],
      kind: "jurisdiction",
    },
  ],
});
