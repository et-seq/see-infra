import { us } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const CFR_URL = "https://www.ecfr.gov/current";

export default defineRedirectDestination({
  id: "cfr",
  target: CFR_URL,
  description: "Code of Federal Regulations",
  segmentLabels: {
    cfr: "CFR",
    "c.f.r": "C.F.R.",
  },
  routes: [
    {
      segments: [us.root, "cfr"],
      kind: "jurisdiction",
    },
    {
      segments: [us.root, "c.f.r"],
      kind: "jurisdiction",
    },
  ],
});
