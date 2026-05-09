import { describe, expect, it } from "vitest";

import app from "../src/index";

describe("worker entrypoint", () => {
  it("redirects matching paths and preserves request query parameters", async () => {
    const response = await app.request(
      "https://see.etseq.co/ScOtUs?term=constitutional&term=statutory",
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://www.supremecourt.gov/?term=constitutional&term=statutory",
    );
  });

  it("returns a structured 404 for unresolved paths", async () => {
    const response = await app.request("https://see.etseq.co/aus/fca");

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
