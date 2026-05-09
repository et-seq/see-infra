import { describe, expect, it } from "vitest";

import { listRedirects, resolveRedirect, routeKeyFromPathname } from "../src/redirects";

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
    expect(resolveRedirect("/US/SCOTUS/")).toMatchObject({
      target: "https://www.supremecourt.gov/",
    });
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
