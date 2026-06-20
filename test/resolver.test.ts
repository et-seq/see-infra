import { describe, expect, it } from "vitest";

import {
  createRedirectIndex,
  defineRedirectDestination,
  listRedirects,
  resolveRedirect,
  routeKeyFromPathname,
  us,
} from "../src/redirects";

describe("redirect resolver", () => {
  it("resolves the SCOTUS shortcut", () => {
    expect(resolveRedirect("/scotus")).toMatchObject({
      id: "scotus",
      target: "https://www.supremecourt.gov/opinions/slipopinion/25",
      status: 303,
    });
  });

  it("resolves the SCOTUS jurisdiction-specific alias", () => {
    expect(resolveRedirect("/us/scotus")).toMatchObject({
      id: "scotus",
      target: "https://www.supremecourt.gov/opinions/slipopinion/25",
    });
    expect(resolveRedirect("/usa/scotus")).toMatchObject({
      id: "scotus",
      target: "https://www.supremecourt.gov/opinions/slipopinion/25",
    });
  });

  it("resolves the High Court of Australia shortcut and jurisdiction alias", () => {
    expect(resolveRedirect("/hca")).toMatchObject({
      id: "hca",
      target:
        "https://www.hcourt.gov.au/cases-and-judgments/judgments/judgments-1998-current",
    });
    expect(resolveRedirect("/australia/hca")).toMatchObject({
      id: "hca",
      target:
        "https://www.hcourt.gov.au/cases-and-judgments/judgments/judgments-1998-current",
    });
  });

  it("resolves U.S. Code and CFR only under the U.S. jurisdiction", () => {
    expect(resolveRedirect("/us/usc")).toMatchObject({
      id: "usc",
      target: "https://uscode.house.gov/",
    });
    expect(resolveRedirect("/usa/u.s.c")).toMatchObject({
      id: "usc",
      target: "https://uscode.house.gov/",
    });
    expect(resolveRedirect("/us/cfr")).toMatchObject({
      id: "cfr",
      target: "https://www.ecfr.gov/current",
    });
    expect(resolveRedirect("/united-states/c.f.r")).toMatchObject({
      id: "cfr",
      target: "https://www.ecfr.gov/current",
    });
    expect(resolveRedirect("/usc")).toBeUndefined();
    expect(resolveRedirect("/cfr")).toBeUndefined();
  });

  it("resolves the Melbourne University Law Review shortcut only", () => {
    expect(resolveRedirect("/mulr")).toMatchObject({
      id: "mulr",
      target: "https://mulr.com.au/",
    });
    expect(resolveRedirect("/aus/mulr")).toBeUndefined();
  });

  it("resolves the Canadian intellectual property routes", () => {
    expect(resolveRedirect("/canada/cipo")).toMatchObject({
      id: "cipo",
      target:
        "https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en",
    });
    expect(resolveRedirect("/can/tm/gs_manual")).toMatchObject({
      id: "cipo-goods-services-manual",
      target:
        "https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/trademarks/goods-and-services-manual",
    });
    expect(resolveRedirect("/CANADA/TM/SEARCH")).toMatchObject({
      id: "cipo-trademark-search",
      target: "https://ised-isde.canada.ca/cipo/trademark-search/srch",
    });
  });

  it("resolves USPTO as a shortcut and under the U.S. jurisdiction", () => {
    expect(resolveRedirect("/uspto")).toMatchObject({
      id: "uspto",
      target: "https://www.uspto.gov/",
    });
    expect(resolveRedirect("/usa/uspto")).toMatchObject({
      id: "uspto",
      target: "https://www.uspto.gov/",
    });
  });

  it("resolves IP Australia and its manuals through the requested routes", () => {
    expect(resolveRedirect("/ipaus")).toMatchObject({
      id: "ip-australia",
      target: "https://www.ipaustralia.gov.au/",
    });
    expect(resolveRedirect("/aus/ipa")).toMatchObject({
      id: "ip-australia",
      target: "https://www.ipaustralia.gov.au/",
    });
    expect(resolveRedirect("/australia/ipaus")).toMatchObject({
      id: "ip-australia",
      target: "https://www.ipaustralia.gov.au/",
    });
    expect(resolveRedirect("/au/ipa_manual")).toMatchObject({
      id: "ip-australia-manuals",
      target: "https://manuals.ipaustralia.gov.au/",
    });
  });

  it("normalizes case and trailing slashes", () => {
    expect(routeKeyFromPathname("/US/SCOTUS/")).toBe("us/scotus");
    expect(resolveRedirect("/ScOtUs")).toMatchObject({
      target: "https://www.supremecourt.gov/opinions/slipopinion/25",
    });
    expect(resolveRedirect("/US/SCOTUS/")).toMatchObject({
      target: "https://www.supremecourt.gov/opinions/slipopinion/25",
    });
  });

  it("uses declared jurisdiction aliases when resolving jurisdiction routes", () => {
    const redirectIndex = createRedirectIndex([
      defineRedirectDestination({
        id: "california-court-test",
        target: "https://example.test/california-court",
        description: "California court test fixture",
        routes: [
          {
            segments: [us.root, us.ca, "court"],
            kind: "jurisdiction",
          },
        ],
      }),
    ]);

    expect(redirectIndex.resolve("/us/cal/court")).toMatchObject({
      target: "https://example.test/california-court",
    });
    expect(redirectIndex.resolve("/usa/california/court")).toMatchObject({
      target: "https://example.test/california-court",
    });
    expect(redirectIndex.list()).toEqual([
      expect.objectContaining({
        path: "/us/ca/court",
      }),
    ]);
  });

  it("lists route-local shortcut aliases as destination identifiers", () => {
    const redirectIndex = createRedirectIndex([
      defineRedirectDestination({
        id: "shortcut-alias-test",
        target: "https://example.test/shortcut-alias",
        description: "Shortcut alias test fixture",
        routes: [
          {
            segments: [["court", "ct"]],
            kind: "shortcut",
          },
        ],
      }),
    ]);

    expect(redirectIndex.resolve("/ct")).toMatchObject({
      target: "https://example.test/shortcut-alias",
    });
    expect(redirectIndex.list()).toEqual([
      expect.objectContaining({
        path: "/court",
        identifierSegments: ["court", "ct"],
      }),
    ]);
  });

  it("precomputes target URL parts for low-overhead response construction", () => {
    const redirectIndex = createRedirectIndex([
      defineRedirectDestination({
        id: "target-parts-test",
        target: "https://example.test/path?existing=1#section",
        description: "Target parts test fixture",
        routes: [
          {
            segments: ["target-parts"],
            kind: "shortcut",
          },
        ],
      }),
    ]);

    expect(redirectIndex.resolve("/target-parts")).toMatchObject({
      target: "https://example.test/path?existing=1#section",
      targetBase: "https://example.test/path",
      targetHash: "#section",
      targetSearch: "?existing=1",
    });
  });

  it("rejects duplicate redirect ids", () => {
    const duplicate = defineRedirectDestination({
      id: "duplicate",
      target: "https://example.test/one",
      description: "Duplicate one",
      routes: [
        {
          segments: ["one"],
          kind: "shortcut",
        },
      ],
    });

    expect(() => createRedirectIndex([duplicate, duplicate])).toThrow(
      'Duplicate redirect definition id "duplicate"',
    );
  });

  it("rejects non-http redirect targets", () => {
    expect(() =>
      createRedirectIndex([
        defineRedirectDestination({
          id: "invalid-target",
          target: "mailto:test@example.test",
          description: "Invalid target fixture",
          routes: [
            {
              segments: ["invalid-target"],
              kind: "shortcut",
            },
          ],
        }),
      ]),
    ).toThrow('Redirect target for "invalid-target" must use http or https');
  });

  it("rejects redirect targets with credentials", () => {
    expect(() =>
      createRedirectIndex([
        defineRedirectDestination({
          id: "credential-target",
          target: "https://user:password@example.test/path",
          description: "Credential target fixture",
          routes: [
            {
              segments: ["credential-target"],
              kind: "shortcut",
            },
          ],
        }),
      ]),
    ).toThrow(
      'Redirect target for "credential-target" must not include credentials',
    );
  });

  it("rejects invalid redirect status values", () => {
    expect(() =>
      createRedirectIndex([
        defineRedirectDestination({
          id: "invalid-status",
          target: "https://example.test/status",
          description: "Invalid status fixture",
          routes: [
            {
              segments: ["invalid-status"],
              kind: "shortcut",
              status: 300 as never,
            },
          ],
        }),
      ]),
    ).toThrow('Redirect route in "invalid-status" has unsupported status "300"');
  });

  it("leaves unimplemented jurisdiction paths unresolved", () => {
    expect(resolveRedirect("/aus/fca")).toBeUndefined();
  });

  it("allows multiple routes to point to the same destination", () => {
    const paths = listRedirects().map((redirect) => redirect.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/scotus",
        "/us/scotus",
        "/hca",
        "/aus/hca",
        "/us/usc",
        "/us/u.s.c",
        "/us/cfr",
        "/us/c.f.r",
        "/mulr",
        "/canada/cipo",
        "/canada/tm/gs_manual",
        "/canada/tm/search",
        "/uspto",
        "/us/uspto",
        "/ipaus",
        "/aus/ipa",
        "/aus/ipaus",
        "/aus/ipa_manual",
      ]),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("lists route display labels from destination and jurisdiction metadata", () => {
    expect(listRedirects()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/canada/cipo",
          segmentLabels: {
            canada: "Canada",
            cipo: "CIPO",
          },
        }),
        expect.objectContaining({
          path: "/us/u.s.c",
          segmentLabels: {
            us: "United States",
            "u.s.c": "U.S.C.",
            usc: "USC",
          },
        }),
      ]),
    );
  });
});
