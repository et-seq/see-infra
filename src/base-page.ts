import { listRedirects } from "./redirects";
import type { ListedRedirect, RouteKind } from "./redirects";

interface DestinationView {
  readonly id: string;
  readonly description: string;
  readonly target: string;
  readonly routes: readonly RouteView[];
}

interface RouteView {
  readonly path: string;
  readonly status: number;
  readonly kind: RouteKind;
}

interface RouteExplorerPageOptions {
  readonly documentTitle: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  readonly initialResult: string;
  readonly checkCurrentPath: boolean;
}

export const BASE_PAGE_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=300",
  "Content-Type": "text/html; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export const NOT_FOUND_PAGE_RESPONSE_HEADERS = {
  ...BASE_PAGE_RESPONSE_HEADERS,
  "Cache-Control": "no-store",
} as const;

const destinations = buildDestinationViews(listRedirects());
const routeCount = destinations.reduce(
  (count, destination) => count + destination.routes.length,
  0,
);

// Build the document once at module startup; root requests then return a static
// interface while redirect requests retain the low-overhead map lookup path.
export const BASE_PAGE_HTML = renderRouteExplorerPage(destinations, {
  documentTitle: "see.etseq.co routes",
  eyebrow: "see.etseq.co routing",
  heading: "Destination Index",
  lede: "Canonical legal-reference redirects currently served by this Worker.",
  initialResult: "Ready",
  checkCurrentPath: false,
});

export const NOT_FOUND_PAGE_HTML = renderRouteExplorerPage(destinations, {
  documentTitle: "Route not found - see.etseq.co",
  eyebrow: "404",
  heading: "Route Not Found",
  lede: "No redirect is configured for the requested path. Current canonical destinations remain available below.",
  initialResult: "No listed canonical route matched",
  checkCurrentPath: true,
});

function buildDestinationViews(
  redirects: readonly ListedRedirect[],
): readonly DestinationView[] {
  const destinationMap = new Map<string, DestinationView>();

  for (const redirect of redirects) {
    const existingDestination = destinationMap.get(redirect.id);
    const route = {
      path: redirect.path,
      status: redirect.status,
      kind: redirect.kind,
    };

    if (!existingDestination) {
      destinationMap.set(redirect.id, {
        id: redirect.id,
        description: redirect.description,
        target: redirect.target,
        routes: [route],
      });
      continue;
    }

    destinationMap.set(redirect.id, {
      ...existingDestination,
      routes: [...existingDestination.routes, route],
    });
  }

  return [...destinationMap.values()]
    .map((destination) => ({
      ...destination,
      routes: [...destination.routes].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
    }))
    .sort((left, right) => left.description.localeCompare(right.description));
}

function renderRouteExplorerPage(
  destinationList: readonly DestinationView[],
  options: RouteExplorerPageOptions,
) {
  const destinationData = escapeScriptJson(destinationList);
  const renderedDestinations = destinationList
    .map(renderDestinationCard)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.documentTitle)}</title>
  <style>
    :root {
      color-scheme: dark;
      --background: #050505;
      --surface: rgba(20, 20, 22, 0.78);
      --surface-strong: rgba(32, 32, 35, 0.86);
      --surface-subtle: rgba(255, 255, 255, 0.055);
      --border: rgba(255, 255, 255, 0.13);
      --border-strong: rgba(255, 255, 255, 0.26);
      --text: #f4f4f5;
      --muted: #a8a8ad;
      --dim: #77777e;
      --focus: #ffffff;
      --shadow: rgba(0, 0, 0, 0.45);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      color: var(--text);
      background:
        linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.032) 1px, transparent 1px),
        var(--background);
      background-size: 40px 40px, 40px 40px, auto;
    }

    a {
      color: inherit;
    }

    button,
    input {
      font: inherit;
    }

    button {
      cursor: pointer;
    }

    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 36px 0 42px;
    }

    .topbar,
    .controls,
    .checker {
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 24px 80px var(--shadow);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 28px;
      align-items: end;
      padding: 28px;
      border-radius: 8px;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 0.76rem;
      line-height: 1.2;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 4.8rem;
      line-height: 0.95;
      font-weight: 720;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .lede {
      max-width: 760px;
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.7;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(96px, 1fr));
      gap: 10px;
      min-width: 230px;
    }

    .stat {
      min-height: 92px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-subtle);
    }

    .stat strong {
      display: block;
      font-size: 2rem;
      line-height: 1;
    }

    .stat span {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.78rem;
      line-height: 1.3;
      text-transform: uppercase;
    }

    .workbench {
      display: grid;
      grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
      gap: 16px;
      margin-top: 16px;
      align-items: start;
    }

    .controls,
    .checker {
      padding: 18px;
      border-radius: 8px;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    .label {
      color: var(--muted);
      font-size: 0.74rem;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .input-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    input {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 13px;
      color: var(--text);
      background: rgba(0, 0, 0, 0.38);
      outline: none;
    }

    input:focus {
      border-color: var(--focus);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
    }

    .segmented {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin-top: 14px;
      padding: 5px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.28);
    }

    .segment,
    .action,
    .route-button {
      min-height: 38px;
      border: 1px solid transparent;
      border-radius: 7px;
      color: var(--muted);
      background: transparent;
    }

    .segment[aria-pressed="true"],
    .action,
    .route-button:hover,
    .route-button:focus-visible {
      color: var(--text);
      border-color: var(--border-strong);
      background: rgba(255, 255, 255, 0.1);
    }

    .action {
      flex: 0 0 auto;
      padding: 0 16px;
    }

    .result {
      min-height: 72px;
      margin-top: 14px;
      padding: 13px;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--muted);
      background: rgba(0, 0, 0, 0.25);
      line-height: 1.55;
    }

    .result strong {
      color: var(--text);
      font-weight: 650;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      margin: 24px 0 12px;
      color: var(--muted);
      font-size: 0.86rem;
    }

    .destination-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
      gap: 14px;
    }

    .destination {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 250px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .destination-header {
      padding: 18px 18px 12px;
      border-bottom: 1px solid var(--border);
    }

    .destination-title {
      margin: 0;
      font-size: 1.06rem;
      line-height: 1.35;
      font-weight: 680;
    }

    .destination-id {
      margin-top: 7px;
      color: var(--dim);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.75rem;
      overflow-wrap: anywhere;
    }

    .destination-body {
      padding: 14px 18px 4px;
    }

    .target {
      display: block;
      color: var(--muted);
      font-size: 0.86rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
      text-decoration: none;
    }

    .target:hover,
    .target:focus-visible {
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .routes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .route {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      max-width: 100%;
      min-width: 0;
      min-height: 32px;
      padding: 6px 9px;
      border: 1px solid var(--border);
      border-radius: 7px;
      color: var(--text);
      background: rgba(255, 255, 255, 0.06);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.78rem;
      overflow-wrap: anywhere;
      text-decoration: none;
    }

    .route-path {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .route-kind {
      padding: 2px 6px;
      border-radius: 999px;
      color: #d2d2d5;
      background: rgba(255, 255, 255, 0.1);
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 0.68rem;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .destination-footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 18px 18px;
      color: var(--dim);
      font-size: 0.78rem;
      align-items: center;
    }

    .route-button {
      padding: 0 12px;
      white-space: nowrap;
    }

    .empty {
      display: none;
      min-height: 180px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--muted);
      background: var(--surface);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .empty[data-visible="true"] {
      display: grid;
    }

    @media (max-width: 820px) {
      .shell {
        width: min(100% - 24px, 1180px);
        padding-top: 16px;
      }

      .topbar,
      .workbench {
        grid-template-columns: 1fr;
      }

      .topbar {
        padding: 22px;
      }

      h1 {
        font-size: 2.42rem;
      }

      .stats {
        min-width: 0;
        width: 100%;
      }

      .input-row,
      .toolbar,
      .destination-footer {
        align-items: stretch;
        flex-direction: column;
      }

      .action,
      .route-button {
        width: 100%;
      }
    }

    @media (max-width: 390px) {
      .shell {
        width: calc(100% - 16px);
      }

      .topbar,
      .controls,
      .checker {
        padding: 16px;
      }

      h1 {
        font-size: 2rem;
      }

      .segmented {
        grid-template-columns: 1fr;
      }

      .route {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>
<body data-check-current-path="${String(options.checkCurrentPath)}">
  <main class="shell">
    <section class="topbar" aria-labelledby="pageTitle">
      <div>
        <p class="eyebrow">${escapeHtml(options.eyebrow)}</p>
        <h1 id="pageTitle">${escapeHtml(options.heading)}</h1>
        <p class="lede">${escapeHtml(options.lede)}</p>
      </div>
      <div class="stats" aria-label="Routing summary">
        <div class="stat">
          <strong>${String(destinationList.length)}</strong>
          <span>Destinations</span>
        </div>
        <div class="stat">
          <strong>${String(routeCount)}</strong>
          <span>Routes</span>
        </div>
      </div>
    </section>

    <section class="workbench" aria-label="Routing controls">
      <div class="controls">
        <label class="field">
          <span class="label">Filter</span>
          <input id="filterInput" type="search" autocomplete="off" placeholder="Search route, destination, or target">
        </label>
        <div class="segmented" aria-label="Route type">
          <button class="segment" type="button" data-filter-kind="all" aria-pressed="true">All</button>
          <button class="segment" type="button" data-filter-kind="shortcut" aria-pressed="false">Shortcut</button>
          <button class="segment" type="button" data-filter-kind="jurisdiction" aria-pressed="false">Jurisdiction</button>
        </div>
      </div>

      <div class="checker">
        <label class="field">
          <span class="label">Route Check</span>
          <span class="input-row">
            <input id="routeInput" type="text" autocomplete="off" placeholder="/us/scotus">
            <button id="checkButton" class="action" type="button">Check</button>
          </span>
        </label>
        <div id="checkResult" class="result" aria-live="polite">${escapeHtml(options.initialResult)}</div>
      </div>
    </section>

    <div class="toolbar" aria-live="polite">
      <span id="resultCount">${String(destinationList.length)} destinations</span>
      <span id="routeCount">${String(routeCount)} routes</span>
    </div>

    <section id="destinationGrid" class="destination-grid" aria-label="Destinations">
      ${renderedDestinations}
    </section>
    <div id="emptyState" class="empty">No matching destinations</div>
  </main>

  <script type="application/json" id="routeData">${destinationData}</script>
  <script>
    (() => {
      const destinations = JSON.parse(document.getElementById("routeData").textContent);
      const origin = window.location.origin;
      const grid = document.getElementById("destinationGrid");
      const emptyState = document.getElementById("emptyState");
      const filterInput = document.getElementById("filterInput");
      const resultCount = document.getElementById("resultCount");
      const routeCount = document.getElementById("routeCount");
      const routeInput = document.getElementById("routeInput");
      const checkButton = document.getElementById("checkButton");
      const checkResult = document.getElementById("checkResult");
      const kindButtons = Array.from(document.querySelectorAll("[data-filter-kind]"));
      let activeKind = "all";

      const routeMap = new Map(
        destinations.flatMap((destination) =>
          destination.routes.map((route) => [normalizePath(route.path), { destination, route }]),
        ),
      );

      const render = () => {
        const query = filterInput.value.trim().toLowerCase();
        const filtered = destinations
          .map((destination) => {
            const routes = destination.routes.filter((route) => {
              const matchesKind = activeKind === "all" || route.kind === activeKind;
              const haystack = [
                destination.id,
                destination.description,
                destination.target,
                route.path,
                route.kind,
              ].join(" ").toLowerCase();

              return matchesKind && (!query || haystack.includes(query));
            });

            return routes.length > 0 ? { ...destination, routes } : null;
          })
          .filter(Boolean);

        grid.innerHTML = filtered.map(renderDestination).join("");
        emptyState.dataset.visible = String(filtered.length === 0);
        resultCount.textContent = filtered.length === 1 ? "1 destination" : filtered.length + " destinations";
        const visibleRouteCount = filtered.reduce((count, destination) => count + destination.routes.length, 0);
        routeCount.textContent = visibleRouteCount === 1 ? "1 route" : visibleRouteCount + " routes";
      };

      const checkRoute = () => {
        const routeKey = normalizePath(routeInput.value);
        const match = routeMap.get(routeKey);

        if (!routeKey) {
          checkResult.textContent = "Enter a route path";
          return;
        }

        if (!match) {
          checkResult.textContent = "No listed canonical route matched";
          return;
        }

        checkResult.replaceChildren(
          node("strong", match.route.path),
          document.createTextNode(" -> "),
          link(match.destination.description, match.destination.target),
        );
      };

      filterInput.addEventListener("input", render);
      checkButton.addEventListener("click", checkRoute);
      routeInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          checkRoute();
        }
      });

      kindButtons.forEach((button) => {
        button.addEventListener("click", () => {
          activeKind = button.dataset.filterKind;
          kindButtons.forEach((candidate) => {
            candidate.setAttribute("aria-pressed", String(candidate === button));
          });
          render();
        });
      });

      grid.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-copy-route]");

        if (!button) {
          return;
        }

        const route = button.getAttribute("data-copy-route");
        try {
          if (!navigator.clipboard) {
            throw new Error("Clipboard unavailable");
          }

          await navigator.clipboard.writeText(origin + route);
          button.textContent = "Copied";
        } catch {
          button.textContent = "Copy failed";
        }

        setTimeout(() => {
          button.textContent = "Copy route";
        }, 1200);
      });

      if (document.body.dataset.checkCurrentPath === "true") {
        routeInput.value = window.location.pathname;
        checkRoute();
      }

      function renderDestination(destination) {
        const routes = destination.routes.map((route) => {
          return '<a class="route" href="' + escapeAttribute(route.path) + '">' +
            '<span class="route-path">' + escapeHtml(route.path) + '</span>' +
            '<span class="route-kind">' + escapeHtml(route.kind) + '</span>' +
          '</a>';
        }).join("");

        return '<article class="destination">' +
          '<header class="destination-header">' +
            '<h2 class="destination-title">' + escapeHtml(destination.description) + '</h2>' +
            '<div class="destination-id">' + escapeHtml(destination.id) + '</div>' +
          '</header>' +
          '<div class="destination-body">' +
            '<a class="target" href="' + escapeAttribute(destination.target) + '" target="_blank" rel="noreferrer noopener">' +
              escapeHtml(destination.target) +
            '</a>' +
            '<div class="routes">' + routes + '</div>' +
          '</div>' +
          '<footer class="destination-footer">' +
            '<span>' + destination.routes.length + (destination.routes.length === 1 ? ' route' : ' routes') + '</span>' +
            '<button class="route-button" type="button" data-copy-route="' + escapeAttribute(destination.routes[0].path) + '">Copy route</button>' +
          '</footer>' +
        '</article>';
      }

      function normalizePath(value) {
        const rawValue = value.trim();
        let path = rawValue;

        try {
          if (rawValue.includes("://")) {
            path = new URL(rawValue).pathname;
          }
        } catch {
          path = rawValue;
        }

        try {
          path = decodeURIComponent(path);
        } catch {
        }

        return "/" + path.toLowerCase().split("/").map((segment) => segment.trim()).filter(Boolean).join("/");
      }

      function link(text, href) {
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.target = "_blank";
        anchor.rel = "noreferrer noopener";
        anchor.textContent = text;
        return anchor;
      }

      function node(name, text) {
        const element = document.createElement(name);
        element.textContent = text;
        return element;
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      function escapeAttribute(value) {
        return escapeHtml(value);
      }
    })();
  </script>
</body>
</html>`;
}

function renderDestinationCard(destination: DestinationView) {
  const routes = destination.routes.map(renderRouteLink).join("");

  return `<article class="destination">
        <header class="destination-header">
          <h2 class="destination-title">${escapeHtml(destination.description)}</h2>
          <div class="destination-id">${escapeHtml(destination.id)}</div>
        </header>
        <div class="destination-body">
          <a class="target" href="${escapeAttribute(destination.target)}" target="_blank" rel="noreferrer noopener">${escapeHtml(destination.target)}</a>
          <div class="routes">${routes}</div>
        </div>
        <footer class="destination-footer">
          <span>${String(destination.routes.length)} ${destination.routes.length === 1 ? "route" : "routes"}</span>
          <button class="route-button" type="button" data-copy-route="${escapeAttribute(destination.routes[0]?.path ?? "/")}">Copy route</button>
        </footer>
      </article>`;
}

function renderRouteLink(route: RouteView) {
  return `<a class="route" href="${escapeAttribute(route.path)}"><span class="route-path">${escapeHtml(route.path)}</span><span class="route-kind">${escapeHtml(route.kind)}</span></a>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
