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

  it("reports health without redirecting", async () => {
    const response = await app.request("https://see.etseq.co/__health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      redirectRoutes: 2,
    });
  });
});
