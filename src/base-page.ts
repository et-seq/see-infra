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
  eyebrow: "Routing Directory",
  heading: "[see.etseq.co] Current Routing",
  lede: "Current legal-reference redirects and path options served by this Worker.",
  initialResult: "Awaiting Route",
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
      --background: #050607;
      --surface: rgba(18, 19, 21, 0.8);
      --surface-raised: rgba(25, 26, 29, 0.86);
      --surface-subtle: rgba(255, 255, 255, 0.055);
      --border: rgba(231, 236, 244, 0.13);
      --border-strong: rgba(231, 236, 244, 0.28);
      --text: #f3f5f7;
      --muted: #a8afb8;
      --dim: #757c86;
      --accent: #b8c7d9;
      --accent-strong: #d9e3ee;
      --accent-soft: rgba(184, 199, 217, 0.15);
      --sample: #d6b66f;
      --sample-soft: rgba(214, 182, 111, 0.16);
      --active: #8bc7a8;
      --active-soft: rgba(139, 199, 168, 0.16);
      --code: #beb7d2;
      --code-soft: rgba(190, 183, 210, 0.14);
      --warning: #d6a37f;
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
        linear-gradient(rgba(231, 236, 244, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(231, 236, 244, 0.03) 1px, transparent 1px),
        linear-gradient(135deg, rgba(184, 199, 217, 0.07), transparent 42%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 360px),
        var(--background);
      background-size: 40px 40px, 40px 40px, auto, auto, auto;
      line-height: 1.5;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
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
      width: min(1160px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 46px;
    }

    .topbar,
    .controls,
    .checker,
    .destination,
    .empty {
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 22px 70px var(--shadow);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(210px, auto);
      gap: 24px;
      align-items: end;
      padding: 36px 38px;
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(184, 199, 217, 0.095), rgba(139, 199, 168, 0.028) 52%, rgba(214, 182, 111, 0.035)),
        var(--surface);
    }

    .eyebrow,
    .field-label,
    .meta-label {
      color: var(--muted);
      font-size: 0.72rem;
      line-height: 1.2;
    }

    .eyebrow {
      margin: 0 0 12px;
      color: var(--accent-strong);
      font-size: 0.9rem;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      font-size: 3.55rem;
      line-height: 1.02;
      font-weight: 700;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .lede {
      max-width: 680px;
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 0.98rem;
      line-height: 1.65;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(96px, 1fr));
      gap: 10px;
      min-width: 218px;
    }

    .stat {
      min-height: 86px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-subtle);
    }

    .stat strong {
      display: block;
      font-size: 1.82rem;
      line-height: 1;
      color: var(--accent-strong);
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      margin-top: 16px;
      align-items: start;
    }

    .controls,
    .checker {
      padding: 18px 20px;
      border-radius: 8px;
      align-self: stretch;
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
      min-height: 46px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 14px;
      color: var(--text);
      background: rgba(0, 0, 0, 0.38);
      outline: none;
    }

    input:hover,
    select:hover {
      border-color: var(--border-strong);
      background: rgba(0, 0, 0, 0.46);
    }

    select {
      color-scheme: dark;
    }

    input:focus,
    select:focus,
    button:focus-visible,
    a:focus-visible {
      border-color: var(--accent-strong);
      outline: 3px solid var(--accent-soft);
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
      gap: 5px;
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
      transition:
        border-color 140ms ease,
        background 140ms ease,
        color 140ms ease;
    }

    .segment[aria-pressed="true"],
    .action,
    .route-button:hover,
    .route-button:focus-visible {
      color: var(--text);
      border-color: var(--border-strong);
      background: var(--accent-soft);
    }

    .input-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .route-input-shell {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
    }

    .route-sample {
      position: absolute;
      inset: 1px 14px;
      z-index: 2;
      display: flex;
      align-items: center;
      max-width: calc(100% - 28px);
      color: var(--sample);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.86rem;
      line-height: 1;
      overflow: hidden;
      pointer-events: none;
      white-space: nowrap;
    }

    .route-sample[hidden] {
      display: none;
    }

    .route-sample-text {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .route-sample-text[data-animate="true"] {
      animation: sample-push-up 320ms ease-out;
    }

    .action {
      flex: 0 0 auto;
      min-height: 46px;
      padding: 0 16px;
    }

    input[aria-invalid="true"] {
      border-color: var(--warning);
      outline: 3px solid rgba(214, 163, 127, 0.16);
    }

    .result {
      min-height: 70px;
      margin-top: 14px;
      padding: 14px;
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

    .result a {
      color: var(--accent-strong);
      text-underline-offset: 4px;
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
      min-height: 274px;
      border-radius: 8px;
      overflow: hidden;
      transition:
        border-color 160ms ease,
        background 160ms ease,
        transform 160ms ease;
    }

    .destination:hover {
      border-color: rgba(255, 255, 255, 0.22);
      background: var(--surface-raised);
      transform: translateY(-1px);
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
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent);
    }

    .destination-title {
      margin: 0;
      font-size: 1.02rem;
      line-height: 1.35;
      font-weight: 670;
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
      font-size: 0.84rem;
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
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 7px;
      color: var(--accent-strong);
      background: rgba(255, 255, 255, 0.055);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.77rem;
      overflow-wrap: anywhere;
      text-decoration: none;
    }

    .route:hover {
      border-color: rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.09);
    }

    .route-kind {
      flex: 0 0 auto;
      padding: 2px 6px;
      border-radius: 999px;
      color: var(--accent-strong);
      background: var(--accent-soft);
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
      gap: 12px;
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
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      color: var(--text);
      line-height: 1.45;
    }

    .status-item {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .status-pill {
      padding: 2px 8px;
      border: 1px solid rgba(139, 199, 168, 0.62);
      border-radius: 999px;
      color: #06120d;
      background: var(--active);
      font-size: 0.68rem;
      font-weight: 720;
      line-height: 1.3;
    }

    .status-code {
      padding: 2px 7px;
      border: 1px solid rgba(190, 183, 210, 0.26);
      border-radius: 999px;
      color: var(--code);
      background: var(--code-soft);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.76rem;
      line-height: 1.3;
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

    @keyframes sample-push-up {
      from {
        opacity: 0;
        transform: translateY(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }

    @media (max-width: 820px) {
      .shell {
        width: min(100% - 24px, 1180px);
        padding-top: 18px;
        padding-bottom: 34px;
      }

      .topbar,
      .workbench,
      .filter-grid,
      .level-grid {
        grid-template-columns: 1fr;
      }

      .topbar {
        gap: 20px;
        padding: 22px;
      }

      h1 {
        font-size: 2.24rem;
        line-height: 1.06;
      }

      .lede {
        margin-top: 14px;
        font-size: 0.94rem;
        line-height: 1.6;
      }

      .stats {
        min-width: 0;
        width: 100%;
      }

      .stat {
        min-height: 76px;
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

    @media (max-width: 520px) {
      .shell {
        width: calc(100% - 16px);
        padding-top: 12px;
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
        font-size: 1.55rem;
        line-height: 1.1;
      }

      .stats {
        grid-template-columns: 1fr 1fr;
      }

      .stat strong {
        font-size: 1.55rem;
      }

      .route-sample {
        font-size: 0.8rem;
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
            <input id="filterInput" type="search" autocomplete="off" placeholder="Search Routes">
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
            <span class="route-input-shell">
              <input id="routeInput" type="text" autocomplete="off" aria-describedby="routeSample checkResult" aria-invalid="false">
              <span id="routeSample" class="route-sample" aria-hidden="true"></span>
            </span>
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
      const routeSample = document.getElementById("routeSample");
      const checkButton = document.getElementById("checkButton");
      const checkResult = document.getElementById("checkResult");
      const kindButtons = Array.from(document.querySelectorAll("[data-filter-kind]"));
      const routeSamples = buildRouteSamples(allRoutes.map((entry) => entry.route));
      const routeSampleIntervalMs = 4200;
      const state = {
        base: "all",
        kind: "all",
        levels: [],
        query: "",
      };
      let routeSampleIndex = 0;

      populateBaseSelect();
      renderRouteSample(false);
      render();
      setInterval(rotateRouteSample, routeSampleIntervalMs);

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
      routeInput.addEventListener("input", () => {
        routeInput.setAttribute("aria-invalid", "false");
        updateRouteSampleVisibility();
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
        const enteredRoute = routeInput.value.trim();
        updateRouteSampleVisibility();

        if (!enteredRoute) {
          routeInput.setAttribute("aria-invalid", "true");
          checkResult.textContent = "Please Enter Route";
          updateRouteSampleVisibility();
          return;
        }

        routeInput.setAttribute("aria-invalid", "false");
        const routeKey = normalizePath(enteredRoute);
        const match = routeMap.get(routeKey);

        if (match) {
          checkResult.replaceChildren(
            node("strong", match.route.path),
            document.createTextNode(" -> "),
            link(match.destination.title, match.destination.target),
          );
          return;
        }

        const partialMatches = findPartialRouteMatches(routeKey);

        if (partialMatches.length > 0) {
          checkResult.replaceChildren(
            document.createTextNode("Partial Route. Complete It With: "),
            ...partialMatches.flatMap((entry, index) => {
              const separator = index === 0 ? [] : [document.createTextNode(" ")];

              return [
                ...separator,
                localRouteLink(entry.route.path),
              ];
            }),
          );
          return;
        }

        checkResult.textContent = "No Listed Canonical Route Matched";
      }

      function findPartialRouteMatches(routeKey) {
        const prefix = routeKey.endsWith("/") ? routeKey : routeKey + "/";

        return allRoutes
          .filter((entry) => normalizePath(entry.route.path).startsWith(prefix))
          .slice(0, 4);
      }

      function rotateRouteSample() {
        if (routeSamples.length === 0 || document.hidden) {
          return;
        }

        routeSampleIndex = (routeSampleIndex + 1) % routeSamples.length;
        renderRouteSample(true);
      }

      function renderRouteSample(animate) {
        if (routeSamples.length === 0) {
          routeSample.hidden = true;
          return;
        }

        const sample = node("span", "Try " + routeSamples[routeSampleIndex]);
        sample.className = "route-sample-text";
        sample.dataset.animate = String(animate);
        routeSample.replaceChildren(sample);
        updateRouteSampleVisibility();
      }

      function updateRouteSampleVisibility() {
        routeSample.hidden = Boolean(routeInput.value.trim());
      }

      function buildRouteSamples(routes) {
        const samples = [];
        const seen = new Set();

        for (const route of routes) {
          addRouteSample(samples, seen, route.path);

          if (route.kind === "shortcut") {
            addRouteSample(samples, seen, route.path.slice(1));
          }

          if (route.segments.length > 1) {
            addRouteSample(samples, seen, "/" + route.segments.slice(0, -1).join("/"));
          }
        }

        return samples;
      }

      function addRouteSample(samples, seen, value) {
        const sample = value.trim();

        if (!sample || seen.has(sample)) {
          return;
        }

        seen.add(sample);
        samples.push(sample);
      }

      function localRouteLink(path) {
        const anchor = document.createElement("a");
        anchor.href = path;
        anchor.className = "route";
        anchor.textContent = path;
        return anchor;
      }

      function renderDestination(destination) {
        const routes = destination.routes.map(renderRoute).join("");
        const statusSummary = renderRedirectStatuses(
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
              '<span class="field-label">Add After see.etseq.co</span>' +
              '<div class="routes">' + routes + '</div>' +
            '</div>' +
          '</div>' +
          '<footer class="destination-footer">' +
            '<span class="status-block">' +
              '<span class="meta-label">Redirect Status</span>' +
              '<span class="status-description">' + statusSummary + '</span>' +
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

      function renderRedirectStatuses(statuses) {
        return Array.from(new Set(statuses))
          .map(renderRedirectStatus)
          .join("");
      }

      function renderRedirectStatus(status) {
        return '<span class="status-item">' +
          '<span class="status-pill">Active</span>' +
          '<span class="status-code">HTTP ' + escapeHtml(String(status)) + '</span>' +
        '</span>';
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
            <span class="field-label">Add After see.etseq.co</span>
            <div class="routes">${routes}</div>
          </div>
        </div>
        <footer class="destination-footer">
          <span class="status-block">
            <span class="meta-label">Redirect Status</span>
            <span class="status-description">${statusSummary}</span>
          </span>
          <button class="route-button" type="button" data-copy-route="${escapeAttribute(destination.routes[0]?.path ?? "/")}">Copy Route</button>
        </footer>
      </article>`;
}

function renderRouteLink(route: RouteView) {
  return `<a class="route" href="${escapeAttribute(route.path)}"><span class="route-kind">${escapeHtml(route.kindLabel)}</span><span class="route-path">${escapeHtml(route.path)}</span></a>`;
}

function describeRedirectStatuses(statuses: readonly number[]) {
  return [...new Set(statuses)].map(renderRedirectStatus).join("");
}

function renderRedirectStatus(status: number) {
  return `<span class="status-item"><span class="status-pill">Active</span><span class="status-code">HTTP ${escapeHtml(String(status))}</span></span>`;
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
