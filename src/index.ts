import { Hono } from "hono";

import { listRedirects, resolveRedirect } from "./redirects";

type WorkerEnv = Record<string, never>;

const app = new Hono<{ Bindings: WorkerEnv }>();

app.get("/__health", (context) => {
  return context.json({
    status: "ok",
    redirectRoutes: listRedirects().length,
  });
});

app.all("*", (context) => {
  const requestUrl = new URL(context.req.url);
  const redirect = resolveRedirect(requestUrl.pathname);

  if (!redirect) {
    return context.json(
      {
        error: "redirect_not_found",
        path: requestUrl.pathname,
      },
      404,
    );
  }

  const destination = new URL(redirect.target);

  if (redirect.preserveQuery) {
    appendSearchParams(destination.searchParams, requestUrl.searchParams);
  }

  return context.redirect(destination.toString(), redirect.status);
});

// Preserve the destination's own query string and append request query
// parameters. This avoids route-specific code for targets that later need
// search parameters while keeping destination URLs authoritative.
function appendSearchParams(
  destinationParams: URLSearchParams,
  requestParams: URLSearchParams,
) {
  requestParams.forEach((value, key) => {
    destinationParams.append(key, value);
  });
}

export default app;
