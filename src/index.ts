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

  // Query strings are preserved by default so a future target can receive
  // search parameters without adding route-specific worker code.
  if (redirect.preserveQuery) {
    destination.search = requestUrl.search;
  }

  return context.redirect(destination.toString(), redirect.status);
});

export default app;
