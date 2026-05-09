import { describe, expect, it } from "vitest";

import {
  createRedirectIndex,
  defineRedirectDestination,
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
    expect(resolveRedirect("/usa/scotus")).toMatchObject({
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

  it("uses route-local aliases when resolving jurisdiction routes", () => {
    const redirectIndex = createRedirectIndex([
      defineRedirectDestination({
        id: "california-court-test",
        target: "https://example.test/california-court",
        description: "California court test fixture",
        routes: [
          {
            segments: [
              ["us", "usa", "united-states"],
              ["ca", "cal", "california"],
              "court",
            ],
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

    expect(paths).toEqual(expect.arrayContaining(["/scotus", "/us/scotus"]));
    expect(new Set(paths).size).toBe(paths.length);
  });
});
