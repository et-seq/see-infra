import { aus } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const IP_AUSTRALIA_URL = "https://www.ipaustralia.gov.au";

export default defineRedirectDestination({
  id: "ip-australia",
  target: IP_AUSTRALIA_URL,
  description: "IP Australia",
  segmentLabels: {
    ipa: "IP Australia",
    ipaus: "IP Australia",
  },
  routes: [
    {
      segments: ["ipaus"],
      kind: "shortcut",
    },
    {
      segments: [aus.root, "ipa"],
      kind: "jurisdiction",
    },
    {
      segments: [aus.root, "ipaus"],
      kind: "jurisdiction",
    },
  ],
});
