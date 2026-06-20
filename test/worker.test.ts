import { describe, expect, it } from "vitest";

import app from "../src/index";

describe("worker entrypoint", () => {
  it("serves the interactive destination index at the root path", async () => {
    const response = await app.request("https://see.etseq.co/");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(body).toContain("[see.etseq.co] Current Routing");
    expect(body).toContain("/canada/cipo");
    expect(body).toContain("routeData");
    expect(body).toContain("Base Jurisdiction");
    expect(body).toContain("Route Level Filters");
    expect(body).toContain("level-filter-in");
    expect(body).toContain("hasSelectedJurisdictionBase");
    expect(body).toContain("levelFilters.replaceChildren();");
    expect(body).toContain("All Jurisdictions");
    expect(body).toContain("Target URL");
    expect(body).toContain("Add After see.etseq.co");
    expect(body).toContain("Redirect Status");
    expect(body).toContain('id="routeSample"');
    expect(body).toContain("sample-push-up");
    expect(body).toContain("Please Enter Route");
    expect(body).toContain("Partial Route. Complete It With:");
    expect(body).toContain("buildRouteSamples");
    expect(body).toContain('status-pill">Active');
    expect(body).toContain('status-code">HTTP 303');
    expect(body).toContain(
      'name="viewport" content="width=device-width, initial-scale=1"',
    );
    expect(body).toContain("@media (max-width: 820px)");
    expect(body).toContain("@media (max-width: 520px)");
    expect(body).toContain("route-path");
    const jurisdictionTagIndex = body.indexOf('route-kind">Jurisdiction');
    const canadaRouteIndex = body.indexOf('route-path">/canada/cipo');
    expect(jurisdictionTagIndex).toBeGreaterThanOrEqual(0);
    expect(canadaRouteIndex).toBeGreaterThanOrEqual(0);
    expect(jurisdictionTagIndex).toBeLessThan(canadaRouteIndex);
  });

  it("redirects matching paths and preserves request query parameters", async () => {
    const response = await app.request(
      "https://see.etseq.co/ScOtUs?term=constitutional&term=statutory",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://www.supremecourt.gov/opinions/slipopinion/25?term=constitutional&term=statutory",
    );
  });

  it("serves the interactive 404 page for unresolved paths", async () => {
    const response = await app.request("https://see.etseq.co/aus/fca");
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain("Route Not Found");
    expect(body).toContain('data-check-current-path="true"');
    expect(body).toContain("/aus/ipa");
  });

  it("returns a structured JSON 404 when requested by API clients", async () => {
    const response = await app.request("https://see.etseq.co/aus/fca", {
      headers: {
        Accept: "application/json",
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "redirect_not_found",
      path: "/aus/fca",
    });
  });

  it("hides health checks without the configured token", async () => {
    const response = await app.request("https://see.etseq.co/__health", {}, {
      HEALTHCHECK_TOKEN: "expected-token",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
    });
  });

  it("hides health checks when the token secret is not configured", async () => {
    const response = await app.request("https://see.etseq.co/__health");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
    });
  });

  it("reports health with the configured token", async () => {
    const response = await app.request(
      "https://see.etseq.co/__health",
      {
        headers: {
          "x-health-token": "expected-token",
        },
      },
      {
        HEALTHCHECK_TOKEN: "expected-token",
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
    });
  });
});
