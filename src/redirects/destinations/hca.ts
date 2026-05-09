import { aus } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const HCA_JUDGMENTS_URL =
  "https://www.hcourt.gov.au/cases-and-judgments/judgments/judgments-1998-current";

export default defineRedirectDestination({
  id: "hca",
  target: HCA_JUDGMENTS_URL,
  description: "High Court of Australia judgments",
  routes: [
    {
      segments: ["hca"],
      kind: "shortcut",
    },
    {
      segments: [aus.root, "hca"],
      kind: "jurisdiction",
    },
  ],
});
