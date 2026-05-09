import { us } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const USC_URL = "https://uscode.house.gov/";

export default defineRedirectDestination({
  id: "usc",
  target: USC_URL,
  description: "United States Code",
  routes: [
    {
      segments: [us.root, "usc"],
      kind: "jurisdiction",
    },
    {
      segments: [us.root, "u.s.c"],
      kind: "jurisdiction",
    },
  ],
});
