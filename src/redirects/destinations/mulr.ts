import { defineRedirectDestination } from "../types";

const MULR_URL = "https://mulr.com.au/";

export default defineRedirectDestination({
  id: "mulr",
  target: MULR_URL,
  description: "Melbourne University Law Review",
  segmentLabels: {
    mulr: "MULR",
  },
  routes: [
    {
      segments: ["mulr"],
      kind: "shortcut",
    },
  ],
});
