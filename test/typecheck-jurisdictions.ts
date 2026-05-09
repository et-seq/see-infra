import { defineRedirectDestination, us } from "../src/redirects";

defineRedirectDestination({
  id: "valid-jurisdiction-route",
  target: "https://example.test/valid",
  description: "Valid jurisdiction route type fixture",
  routes: [
    {
      segments: [us.root, us.ca, "court"],
      kind: "jurisdiction",
    },
  ],
});

defineRedirectDestination({
  id: "invalid-top-level-jurisdiction",
  target: "https://example.test/invalid",
  description: "Invalid top-level jurisdiction route type fixture",
  routes: [
    // @ts-expect-error Jurisdiction routes must begin with a declared jurisdiction segment.
    {
      segments: ["not-declared", "court"],
      kind: "jurisdiction",
    },
  ],
});

defineRedirectDestination({
  id: "invalid-jurisdiction-alias-array",
  target: "https://example.test/invalid-alias-array",
  description: "Invalid jurisdiction alias array type fixture",
  routes: [
    {
      // @ts-expect-error Jurisdiction aliases must be declared in jurisdiction files.
      segments: [["us", "usa"], "court"],
      kind: "jurisdiction",
    },
  ],
});

defineRedirectDestination({
  id: "valid-shortcut-alias-array",
  target: "https://example.test/shortcut",
  description: "Shortcut aliases can be route-local",
  routes: [
    {
      segments: [["court", "ct"]],
      kind: "shortcut",
    },
  ],
});
