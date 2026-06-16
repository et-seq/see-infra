import { Hono } from "hono";

import {
  BASE_PAGE_HTML,
  BASE_PAGE_RESPONSE_HEADERS,
  NOT_FOUND_PAGE_HTML,
  NOT_FOUND_PAGE_RESPONSE_HEADERS,
} from "./base-page";
import { resolveRedirect } from "./redirects";

interface WorkerEnv {
  readonly HEALTHCHECK_TOKEN?: string;
}

const HEALTHCHECK_TOKEN_HEADER = "x-health-token";

const app = new Hono<{ Bindings: WorkerEnv }>();

app.get("/", () => {
  return new Response(BASE_PAGE_HTML, {
    headers: BASE_PAGE_RESPONSE_HEADERS,
  });
});

app.get("/__health", (context) => {
  const expectedToken = context.env?.HEALTHCHECK_TOKEN?.trim();
  const suppliedToken = context.req.header(HEALTHCHECK_TOKEN_HEADER)?.trim();

  if (!expectedToken || suppliedToken !== expectedToken) {
    return context.json({ error: "not_found" }, 404);
  }

  return context.json({
    status: "ok",
  });
});

app.all("*", (context) => {
  const requestTarget = parseRequestTarget(context.req.raw.url);
  const redirect = resolveRedirect(requestTarget.pathname);

  if (!redirect) {
    if (!acceptsJsonOnly(context.req.header("Accept"))) {
      return new Response(NOT_FOUND_PAGE_HTML, {
        status: 404,
        headers: NOT_FOUND_PAGE_RESPONSE_HEADERS,
      });
    }

    return context.json(
      {
        error: "redirect_not_found",
        path: requestTarget.pathname,
      },
      404,
    );
  }

  return new Response(null, {
    status: redirect.status,
    headers: {
      Location: getRedirectLocation(redirect, requestTarget.search),
    },
  });
});

function acceptsJsonOnly(acceptHeader: string | undefined) {
  const accept = acceptHeader?.toLowerCase() ?? "";

  return accept.includes("application/json") && !accept.includes("text/html");
}

function parseRequestTarget(url: string) {
  const authorityStart = url.indexOf("://");
  const pathStart =
    authorityStart === -1 ? 0 : url.indexOf("/", authorityStart + 3);

  if (pathStart === -1) {
    return {
      pathname: "/",
      search: "",
    };
  }

  const queryStart = url.indexOf("?", pathStart);

  if (queryStart === -1) {
    return {
      pathname: url.slice(pathStart) || "/",
      search: "",
    };
  }

  return {
    pathname: url.slice(pathStart, queryStart) || "/",
    search: url.slice(queryStart),
  };
}

function getRedirectLocation(
  redirect: {
    readonly target: string;
    readonly targetBase: string;
    readonly targetHash: string;
    readonly targetSearch: string;
    readonly preserveQuery: boolean;
  },
  requestSearch: string,
) {
  if (!redirect.preserveQuery || requestSearch.length === 0) {
    return redirect.target;
  }

  return `${redirect.targetBase}${mergeSearch(
    redirect.targetSearch,
    requestSearch,
  )}${redirect.targetHash}`;
}

function mergeSearch(targetSearch: string, requestSearch: string) {
  if (targetSearch.length === 0) {
    return requestSearch;
  }

  return `${targetSearch}&${requestSearch.slice(1)}`;
}

export default app;
