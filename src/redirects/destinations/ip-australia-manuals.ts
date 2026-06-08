import { aus } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const IP_AUSTRALIA_MANUALS_URL = "https://manuals.ipaustralia.gov.au";

export default defineRedirectDestination({
  id: "ip-australia-manuals",
  target: IP_AUSTRALIA_MANUALS_URL,
  description: "IP Australia manuals",
  routes: [
    {
      segments: [aus.root, "ipa_manual"],
      kind: "jurisdiction",
    },
  ],
});
