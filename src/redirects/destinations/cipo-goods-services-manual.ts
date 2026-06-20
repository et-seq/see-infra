import { canada } from "../jurisdictions";
import { defineRedirectDestination } from "../types";

const CIPO_GOODS_SERVICES_MANUAL_URL =
  "https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/trademarks/goods-and-services-manual";

export default defineRedirectDestination({
  id: "cipo-goods-services-manual",
  target: CIPO_GOODS_SERVICES_MANUAL_URL,
  description: "CIPO Goods and Services Manual",
  segmentLabels: {
    tm: "Trade Marks",
    gs_manual: "Goods and Services Manual",
  },
  routes: [
    {
      segments: [canada.root, "tm", "gs_manual"],
      kind: "jurisdiction",
    },
  ],
});
