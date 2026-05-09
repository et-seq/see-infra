import { describe, expect, it } from "vitest";

import {
  canonicalizeJurisdictionSegments,
  createRedirectIndex,
  defineRedirectDestination,
  jurisdictionRouteKeyFromPathname,
  listRedirects,
  resolveRedirect,
  routeKeyFromPathname,
} from "../src/redirects";

describe("redirect resolver", () => {
  it("resolves the SCOTUS shortcut", () => {
    expect(resolveRedirect("/scotus")).toMatchObject({
      id: "scotus",
      target: "https://www.supremecourt.gov/",
      status: 302,
    });
  });

  it("resolves the SCOTUS jurisdiction-specific alias", () => {
    expect(resolveRedirect("/us/scotus")).toMatchObject({
      id: "scotus",
      target: "https://www.supremecourt.gov/",
    });
  });

  it("normalizes case and trailing slashes", () => {
    expect(routeKeyFromPathname("/US/SCOTUS/")).toBe("us/scotus");
    expect(resolveRedirect("/ScOtUs")).toMatchObject({
      target: "https://www.supremecourt.gov/",
    });
    expect(resolveRedirect("/US/SCOTUS/")).toMatchObject({
      target: "https://www.supremecourt.gov/",
    });
  });

  it("canonicalizes sub-jurisdiction aliases", () => {
    expect(canonicalizeJurisdictionSegments(["us", "cal", "court"])).toEqual([
      "us",
      "ca",
      "court",
    ]);
    expect(
      canonicalizeJurisdictionSegments(["usa", "california", "court"]),
    ).toEqual(["us", "ca", "court"]);
    expect(
      canonicalizeJurisdictionSegments(["aus", "victoria", "vsc"]),
    ).toEqual(["aus", "vic", "vsc"]);
  });

  it("uses jurisdiction aliases when resolving jurisdiction routes", () => {
    const redirectIndex = createRedirectIndex([
      defineRedirectDestination({
        id: "california-court-test",
        target: "https://example.test/california-court",
        description: "California court test fixture",
        routes: [
          {
            segments: ["us", "ca", "court"],
            kind: "jurisdiction",
          },
        ],
      }),
    ]);

    expect(jurisdictionRouteKeyFromPathname("/USA/CAL/court")).toBe(
      "us/ca/court",
    );
    expect(redirectIndex.resolve("/us/cal/court")).toMatchObject({
      target: "https://example.test/california-court",
    });
    expect(redirectIndex.resolve("/usa/california/court")).toMatchObject({
      target: "https://example.test/california-court",
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

    expect(paths).toEqual(expect.arrayContaining(["/scotus", "/us/scotus"]));
    expect(new Set(paths).size).toBe(paths.length);
  });
});
