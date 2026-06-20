import { listRedirects } from "./redirects";
import type { ListedRedirect, RouteKind } from "./redirects";

interface DestinationView {
  readonly id: string;
  readonly title: string;
  readonly target: string;
  readonly routes: readonly RouteView[];
}

interface RouteView {
  readonly path: string;
  readonly status: number;
  readonly kind: RouteKind;
  readonly kindLabel: string;
  readonly segments: readonly string[];
  readonly baseSegment: string;
  readonly baseLabel: string;
}

interface RouteExplorerPageOptions {
  readonly documentTitle: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  readonly initialResult: string;
  readonly checkCurrentPath: boolean;
}

const SHORTCUT_BASE_SEGMENT = "__shortcut";

const BASE_LABELS: Record<string, string> = {
  aus: "Australia",
  canada: "Canada",
  us: "United States",
  [SHORTCUT_BASE_SEGMENT]: "Shortcuts",
};

const SEGMENT_LABELS: Record<string, string> = {
  aus: "Australia",
  canada: "Canada",
  cfr: "CFR",
  cipo: "CIPO",
  "c.f.r": "C.F.R.",
  gs_manual: "Goods and Services Manual",
  hca: "HCA",
  ipa: "IP Australia",
  ipa_manual: "IP Australia Manual",
  ipaus: "IP Australia",
  mulr: "MULR",
  scotus: "SCOTUS",
  search: "Search",
  tm: "Trade Marks",
  us: "United States",
  usc: "USC",
  uspto: "USPTO",
  "u.s.c": "U.S.C.",
};

const TITLE_CASE_ACRONYMS = new Set([
  "CFR",
  "CIPO",
  "HCA",
  "IP",
  "MULR",
  "SCOTUS",
  "US",
  "USPTO",
]);

const TITLE_CASE_MINOR_WORDS = new Set([
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
]);

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

// Build the documents once at module startup; request-time redirect handling
// remains the lightweight normalized map lookup in the resolver.
export const BASE_PAGE_HTML = renderRouteExplorerPage(destinations, {
  documentTitle: "[see.etseq.co] Current Routing",
  eyebrow: "See.Etseq.Co Routing",
  heading: "[see.etseq.co] Current Routing",
  lede: "Canonical legal-reference redirects currently served by this Worker.",
  initialResult: "Ready",
  checkCurrentPath: false,
});

export const NOT_FOUND_PAGE_HTML = renderRouteExplorerPage(destinations, {
  documentTitle: "Route Not Found - See.Etseq.Co",
  eyebrow: "404",
  heading: "Route Not Found",
  lede: "No redirect is configured for the requested path. Current canonical destinations remain available below.",
  initialResult: "No Listed Canonical Route Matched",
  checkCurrentPath: true,
});

function buildDestinationViews(
  redirects: readonly ListedRedirect[],
): readonly DestinationView[] {
  const destinationMap = new Map<string, DestinationView>();

  for (const redirect of redirects) {
    const existingDestination = destinationMap.get(redirect.id);
    const route = buildRouteView(redirect);

    if (!existingDestination) {
      destinationMap.set(redirect.id, {
        id: redirect.id,
        title: toTitleCase(redirect.description),
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
    .sort((left, right) => left.title.localeCompare(right.title));
}

function buildRouteView(redirect: ListedRedirect): RouteView {
  const segments = splitPathSegments(redirect.path);
  const baseSegment =
    redirect.kind === "shortcut"
      ? SHORTCUT_BASE_SEGMENT
      : (segments[0] ?? "");

  return {
    path: redirect.path,
    status: redirect.status,
    kind: redirect.kind,
    kindLabel: toTitleCase(redirect.kind),
    segments,
    baseSegment,
    baseLabel: formatSegmentLabel(baseSegment),
  };
}

function splitPathSegments(path: string) {
  return path
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
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
      --surface-subtle: rgba(255, 255, 255, 0.055);
      --border: rgba(255, 255, 255, 0.13);
      --border-strong: rgba(255, 255, 255, 0.26);
      --text: #f4f4f5;
      --muted: #a8a8ad;
      --dim: #77777e;
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
    input,
    select {
      font: inherit;
    }

    button,
    select {
      cursor: pointer;
    }

    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 36px 0 42px;
    }

    .topbar,
    .controls,
    .checker,
    .destination,
    .empty {
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

    .eyebrow,
    .field-label,
    .meta-label {
      color: var(--muted);
      font-size: 0.74rem;
      line-height: 1.2;
    }

    .eyebrow {
      margin: 0 0 10px;
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
    }

    .workbench {
      display: grid;
      grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr);
      gap: 16px;
      margin-top: 16px;
      align-items: start;
    }

    .controls,
    .checker {
      padding: 18px;
      border-radius: 8px;
    }

    .controls {
      display: grid;
      gap: 14px;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    input,
    select {
      width: 100%;
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 13px;
      color: var(--text);
      background: rgba(0, 0, 0, 0.38);
      outline: none;
    }

    select {
      color-scheme: dark;
    }

    input:focus,
    select:focus,
    button:focus-visible,
    a:focus-visible {
      border-color: #ffffff;
      outline: 3px solid rgba(255, 255, 255, 0.12);
      outline-offset: 2px;
    }

    .filter-grid,
    .level-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .level-filter {
      animation: level-filter-in 160ms ease-out;
    }

    .segmented {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
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

    .input-row {
      display: flex;
      gap: 10px;
      align-items: center;
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
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 14px;
    }

    .destination {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 282px;
      border-radius: 8px;
      overflow: hidden;
    }

    .destination-header,
    .destination-body,
    .destination-footer {
      padding: 16px 18px;
    }

    .destination-header {
      display: grid;
      gap: 8px;
      border-bottom: 1px solid var(--border);
    }

    .destination-title {
      margin: 0;
      font-size: 1.08rem;
      line-height: 1.35;
      font-weight: 680;
    }

    .destination-id {
      color: var(--dim);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.75rem;
      overflow-wrap: anywhere;
    }

    .destination-body {
      display: grid;
      align-content: start;
      gap: 14px;
    }

    .target {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 0.86rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
      text-decoration: none;
    }

    .target:hover {
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .routes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
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

    .route-kind {
      flex: 0 0 auto;
      padding: 2px 6px;
      border-radius: 999px;
      color: #d2d2d5;
      background: rgba(255, 255, 255, 0.1);
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 0.68rem;
      white-space: nowrap;
    }

    .route-path {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .destination-footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--dim);
      font-size: 0.78rem;
      align-items: center;
      border-top: 1px solid var(--border);
    }

    .status-block {
      display: grid;
      gap: 4px;
    }

    .status-description {
      color: var(--text);
      line-height: 1.45;
    }

    .route-button {
      padding: 0 12px;
      white-space: nowrap;
    }

    .empty {
      display: none;
      min-height: 180px;
      place-items: center;
      border-radius: 8px;
      color: var(--muted);
    }

    .empty[data-visible="true"] {
      display: grid;
    }

    @keyframes level-filter-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 820px) {
      .shell {
        width: min(100% - 24px, 1180px);
        padding-top: 16px;
      }

      .topbar,
      .workbench,
      .filter-grid,
      .level-grid {
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
      .checker,
      .destination-header,
      .destination-body,
      .destination-footer {
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
      <div class="stats" aria-label="Routing Summary">
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

    <section class="workbench" aria-label="Routing Controls">
      <div class="controls">
        <div class="filter-grid">
          <label class="field">
            <span class="field-label">Search</span>
            <input id="filterInput" type="search" autocomplete="off" placeholder="Search Route, Destination, Or Target">
          </label>
          <label class="field">
            <span class="field-label">Base Jurisdiction</span>
            <select id="baseSelect"></select>
          </label>
        </div>
        <div id="levelFilters" class="level-grid" aria-label="Route Level Filters"></div>
        <div class="segmented" aria-label="Route Type">
          <button class="segment" type="button" data-filter-kind="all" aria-pressed="true">All</button>
          <button class="segment" type="button" data-filter-kind="shortcut" aria-pressed="false">Shortcut</button>
          <button class="segment" type="button" data-filter-kind="jurisdiction" aria-pressed="false">Jurisdiction</button>
        </div>
      </div>

      <div class="checker">
        <label class="field">
          <span class="field-label">Route Check</span>
          <span class="input-row">
            <input id="routeInput" type="text" autocomplete="off" placeholder="/us/scotus">
            <button id="checkButton" class="action" type="button">Check</button>
          </span>
        </label>
        <div id="checkResult" class="result" aria-live="polite">${escapeHtml(options.initialResult)}</div>
      </div>
    </section>

    <div class="toolbar" aria-live="polite">
      <span id="resultCount">${String(destinationList.length)} Destinations</span>
      <span id="routeCount">${String(routeCount)} Routes</span>
    </div>

    <section id="destinationGrid" class="destination-grid" aria-label="Destinations">
      ${renderedDestinations}
    </section>
    <div id="emptyState" class="empty">No Matching Destinations</div>
  </main>

  <script type="application/json" id="routeData">${destinationData}</script>
  <script>
    (() => {
      const destinations = JSON.parse(document.getElementById("routeData").textContent);
      const allRoutes = destinations.flatMap((destination) =>
        destination.routes.map((route) => ({ destination, route })),
      );
      const routeMap = new Map(
        allRoutes.map((entry) => [normalizePath(entry.route.path), entry]),
      );
      const baseSelect = document.getElementById("baseSelect");
      const levelFilters = document.getElementById("levelFilters");
      const grid = document.getElementById("destinationGrid");
      const emptyState = document.getElementById("emptyState");
      const filterInput = document.getElementById("filterInput");
      const resultCount = document.getElementById("resultCount");
      const routeCount = document.getElementById("routeCount");
      const routeInput = document.getElementById("routeInput");
      const checkButton = document.getElementById("checkButton");
      const checkResult = document.getElementById("checkResult");
      const kindButtons = Array.from(document.querySelectorAll("[data-filter-kind]"));
      const state = {
        base: "all",
        kind: "all",
        levels: [],
        query: "",
      };

      populateBaseSelect();
      render();

      filterInput.addEventListener("input", () => {
        state.query = filterInput.value.trim().toLowerCase();
        render();
      });

      baseSelect.addEventListener("change", () => {
        state.base = baseSelect.value;
        state.levels = [];
        render();
      });

      checkButton.addEventListener("click", checkRoute);
      routeInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          checkRoute();
        }
      });

      kindButtons.forEach((button) => {
        button.addEventListener("click", () => {
          state.kind = button.dataset.filterKind;
          state.levels = [];
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
            throw new Error("Clipboard Unavailable");
          }

          await navigator.clipboard.writeText(window.location.origin + route);
          button.textContent = "Copied";
        } catch {
          button.textContent = "Copy Failed";
        }

        setTimeout(() => {
          button.textContent = "Copy Route";
        }, 1200);
      });

      if (document.body.dataset.checkCurrentPath === "true") {
        routeInput.value = window.location.pathname;
        checkRoute();
      }

      function populateBaseSelect() {
        const options = new Map([["all", "All Jurisdictions"]]);

        for (const entry of allRoutes) {
          options.set(entry.route.baseSegment, entry.route.baseLabel);
        }

        baseSelect.replaceChildren(
          ...Array.from(options.entries())
            .sort((left, right) => {
              if (left[0] === "all") return -1;
              if (right[0] === "all") return 1;
              if (left[0] === "__shortcut") return -1;
              if (right[0] === "__shortcut") return 1;
              return left[1].localeCompare(right[1]);
            })
            .map(([value, label]) => option(value, label)),
        );
      }

      function render() {
        renderLevelFilters();

        const filteredDestinations = destinations
          .map((destination) => {
            const routes = destination.routes.filter((route) => {
              return (
                matchesBase(route) &&
                matchesKind(route) &&
                matchesLevels(route) &&
                matchesQuery(destination, route)
              );
            });

            return routes.length > 0 ? { ...destination, routes } : null;
          })
          .filter(Boolean);

        grid.innerHTML = filteredDestinations.map(renderDestination).join("");
        emptyState.dataset.visible = String(filteredDestinations.length === 0);
        resultCount.textContent =
          filteredDestinations.length === 1
            ? "1 Destination"
            : filteredDestinations.length + " Destinations";
        const visibleRouteCount = filteredDestinations.reduce(
          (count, destination) => count + destination.routes.length,
          0,
        );
        routeCount.textContent =
          visibleRouteCount === 1
            ? "1 Route"
            : visibleRouteCount + " Routes";
      }

      function renderLevelFilters() {
        if (!hasSelectedJurisdictionBase()) {
          state.levels = [];
          levelFilters.replaceChildren();
          return;
        }

        const scopedRoutes = allRoutes
          .map((entry) => entry.route)
          .filter((route) => {
            return (
              route.kind === "jurisdiction" &&
              matchesBase(route) &&
              matchesKind(route)
            );
          });
        const maxDepth = Math.max(
          0,
          ...scopedRoutes.map((route) => levelSegments(route).length),
        );
        const fields = [];

        for (let index = 0; index < maxDepth; index += 1) {
          const options = levelOptions(scopedRoutes, index);

          if (options.length === 0) {
            break;
          }

          const currentValue = state.levels[index] || "";
          const validCurrentValue = options.some(([value]) => value === currentValue)
            ? currentValue
            : "";

          if (currentValue !== validCurrentValue) {
            state.levels = state.levels.slice(0, index);
          }

          fields.push(renderLevelField(index, options, validCurrentValue));

          if (!validCurrentValue) {
            break;
          }
        }

        levelFilters.innerHTML = fields.join("");
        levelFilters.querySelectorAll("select").forEach((select) => {
          select.addEventListener("change", () => {
            const index = Number(select.dataset.levelIndex);
            state.levels[index] = select.value;
            state.levels = state.levels.slice(0, index + 1);
            render();
          });
        });
      }

      function levelOptions(routes, index) {
        const seen = new Map();

        for (const route of routes) {
          const segments = levelSegments(route);
          const previousLevelsMatch = state.levels
            .slice(0, index)
            .every((value, levelIndex) => !value || segments[levelIndex] === value);

          if (!previousLevelsMatch || !segments[index]) {
            continue;
          }

          seen.set(segments[index], formatSegmentLabel(segments[index]));
        }

        return Array.from(seen.entries()).sort((left, right) =>
          left[1].localeCompare(right[1]),
        );
      }

      function renderLevelField(index, options, currentValue) {
        const selectId = "levelFilter" + String(index + 1);
        const label = levelLabel(index);
        const optionHtml = [
          '<option value="">All ' + escapeHtml(label) + '</option>',
          ...options.map(([value, labelText]) => {
            return '<option value="' + escapeAttribute(value) + '"' +
              (value === currentValue ? " selected" : "") +
              ">" + escapeHtml(labelText) + "</option>";
          }),
        ].join("");

        return '<label class="field level-filter" for="' + selectId + '">' +
          '<span class="field-label">' + escapeHtml(label) + '</span>' +
          '<select id="' + selectId + '" data-level-index="' + String(index) + '">' +
            optionHtml +
          '</select>' +
        '</label>';
      }

      function levelLabel(index) {
        return index === 0
          ? "First Subpath"
          : "Subpath Level " + String(index + 1);
      }

      function levelSegments(route) {
        return route.segments.slice(1);
      }

      function matchesBase(route) {
        return state.base === "all" || route.baseSegment === state.base;
      }

      function hasSelectedJurisdictionBase() {
        return state.base !== "all" && state.base !== "__shortcut";
      }

      function matchesKind(route) {
        return state.kind === "all" || route.kind === state.kind;
      }

      function matchesLevels(route) {
        const segments = levelSegments(route);

        return state.levels.every((value, index) => {
          return !value || segments[index] === value;
        });
      }

      function matchesQuery(destination, route) {
        if (!state.query) {
          return true;
        }

        return [
          destination.id,
          destination.title,
          destination.target,
          route.baseLabel,
          route.kindLabel,
          route.path,
        ].join(" ").toLowerCase().includes(state.query);
      }

      function checkRoute() {
        const routeKey = normalizePath(routeInput.value);
        const match = routeMap.get(routeKey);

        if (!routeKey) {
          checkResult.textContent = "Enter A Route Path";
          return;
        }

        if (!match) {
          checkResult.textContent = "No Listed Canonical Route Matched";
          return;
        }

        checkResult.replaceChildren(
          node("strong", match.route.path),
          document.createTextNode(" -> "),
          link(match.destination.title, match.destination.target),
        );
      }

      function renderDestination(destination) {
        const routes = destination.routes.map(renderRoute).join("");
        const statusSummary = describeRedirectStatuses(
          destination.routes.map((route) => route.status),
        );

        return '<article class="destination">' +
          '<header class="destination-header">' +
            '<span class="field-label">Destination</span>' +
            '<h2 class="destination-title">' + escapeHtml(destination.title) + '</h2>' +
            '<div>' +
              '<span class="meta-label">Identifier</span>' +
              '<div class="destination-id">' + escapeHtml(destination.id) + '</div>' +
            '</div>' +
          '</header>' +
          '<div class="destination-body">' +
            '<div>' +
              '<span class="field-label">Target URL</span>' +
              '<a class="target" href="' + escapeAttribute(destination.target) + '" target="_blank" rel="noreferrer noopener">' +
                escapeHtml(destination.target) +
              '</a>' +
            '</div>' +
            '<div>' +
              '<span class="field-label">Available Routes</span>' +
              '<div class="routes">' + routes + '</div>' +
            '</div>' +
          '</div>' +
          '<footer class="destination-footer">' +
            '<span class="status-block">' +
              '<span class="meta-label">Redirect Status</span>' +
              '<span class="status-description">' + escapeHtml(statusSummary) + '</span>' +
            '</span>' +
            '<button class="route-button" type="button" data-copy-route="' + escapeAttribute(destination.routes[0].path) + '">Copy Route</button>' +
          '</footer>' +
        '</article>';
      }

      function renderRoute(route) {
        return '<a class="route" href="' + escapeAttribute(route.path) + '">' +
          '<span class="route-kind">' + escapeHtml(route.kindLabel) + '</span>' +
          '<span class="route-path">' + escapeHtml(route.path) + '</span>' +
        '</a>';
      }

      function describeRedirectStatuses(statuses) {
        return Array.from(new Set(statuses))
          .map(describeRedirectStatus)
          .join(" | ");
      }

      function describeRedirectStatus(status) {
        switch (Number(status)) {
          case 301:
            return "301: Permanent Redirect. Redirection Active.";
          case 302:
            return "302: Temporary Redirect. Redirection Active.";
          case 307:
            return "307: Temporary Redirect. Redirection Active; Request Method Preserved.";
          case 308:
            return "308: Permanent Redirect. Redirection Active; Request Method Preserved.";
          default:
            return String(status) + ": Redirect Status Configured.";
        }
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

      function formatSegmentLabel(segment) {
        const knownLabel = ${escapeScriptJson(BASE_LABELS)}[segment] || ${escapeScriptJson(SEGMENT_LABELS)}[segment];

        if (knownLabel) {
          return knownLabel;
        }

        return toTitleCase(segment.replace(/[._-]+/g, " "));
      }

      function toTitleCase(value) {
        return String(value)
          .trim()
          .split(/\\s+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
      }

      function option(value, label) {
        const element = document.createElement("option");
        element.value = value;
        element.textContent = label;
        return element;
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
  const statusSummary = describeRedirectStatuses(
    destination.routes.map((route) => route.status),
  );

  return `<article class="destination">
        <header class="destination-header">
          <span class="field-label">Destination</span>
          <h2 class="destination-title">${escapeHtml(destination.title)}</h2>
          <div>
            <span class="meta-label">Identifier</span>
            <div class="destination-id">${escapeHtml(destination.id)}</div>
          </div>
        </header>
        <div class="destination-body">
          <div>
            <span class="field-label">Target URL</span>
            <a class="target" href="${escapeAttribute(destination.target)}" target="_blank" rel="noreferrer noopener">${escapeHtml(destination.target)}</a>
          </div>
          <div>
            <span class="field-label">Available Routes</span>
            <div class="routes">${routes}</div>
          </div>
        </div>
        <footer class="destination-footer">
          <span class="status-block">
            <span class="meta-label">Redirect Status</span>
            <span class="status-description">${escapeHtml(statusSummary)}</span>
          </span>
          <button class="route-button" type="button" data-copy-route="${escapeAttribute(destination.routes[0]?.path ?? "/")}">Copy Route</button>
        </footer>
      </article>`;
}

function renderRouteLink(route: RouteView) {
  return `<a class="route" href="${escapeAttribute(route.path)}"><span class="route-kind">${escapeHtml(route.kindLabel)}</span><span class="route-path">${escapeHtml(route.path)}</span></a>`;
}

function describeRedirectStatuses(statuses: readonly number[]) {
  return [...new Set(statuses)].map(describeRedirectStatus).join(" | ");
}

function describeRedirectStatus(status: number) {
  switch (status) {
    case 301:
      return "301: Permanent Redirect. Redirection Active.";
    case 302:
      return "302: Temporary Redirect. Redirection Active.";
    case 307:
      return "307: Temporary Redirect. Redirection Active; Request Method Preserved.";
    case 308:
      return "308: Permanent Redirect. Redirection Active; Request Method Preserved.";
    default:
      return `${String(status)}: Redirect Status Configured.`;
  }
}

function formatSegmentLabel(segment: string) {
  return (
    BASE_LABELS[segment] ??
    SEGMENT_LABELS[segment] ??
    toTitleCase(segment.replace(/[._-]+/g, " "))
  );
}

function toTitleCase(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  return words
    .map((word, index) => {
      const normalizedWord = word.replace(/[^a-z0-9]/gi, "").toUpperCase();
      const lowerWord = word.toLowerCase();
      const isEdgeWord = index === 0 || index === words.length - 1;

      if (TITLE_CASE_ACRONYMS.has(normalizedWord)) {
        return normalizedWord;
      }

      if (!isEdgeWord && TITLE_CASE_MINOR_WORDS.has(lowerWord)) {
        return lowerWord;
      }

      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
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
