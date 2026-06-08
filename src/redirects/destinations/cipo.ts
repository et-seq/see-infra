import { canada } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const CIPO_URL =
  "https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en";

export default defineRedirectDestination({
  id: "cipo",
  target: CIPO_URL,
  description: "Canadian Intellectual Property Office",
  routes: [
    {
      segments: [canada.root, "cipo"],
      kind: "jurisdiction",
    },
  ],
});
