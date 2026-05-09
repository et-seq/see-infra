# see-infra

Cloudflare Worker redirector for `see.etseq.co/*`.

The Worker maps short legal-reference paths to external websites. Redirect matching is case-insensitive, and jurisdiction paths can use aliases for top-level and nested jurisdictions.

## Current Routes

- `https://see.etseq.co/scotus` -> `https://www.supremecourt.gov/`
- `https://see.etseq.co/us/scotus` -> `https://www.supremecourt.gov/`

The Australia jurisdiction currently has no concrete redirect targets.

## Project Layout

- `src/index.ts`: Worker entrypoint and HTTP redirect handling.
- `src/redirects/resolver.ts`: route indexing, path normalization, duplicate-route checks, and redirect lookup.
- `src/redirects/jurisdictions/*.ts`: declared jurisdiction segments and aliases.
- `src/redirects/destinations/*.ts`: one file per redirect destination.
- `scripts/generate-destination-manifest.mjs`: scans destination files and generates the import manifest.
- `wrangler.jsonc`: Cloudflare Worker deployment and custom domain configuration.

## Development

Prerequisites:

- Node.js `22` or newer.
- npm.
- Wrangler authentication for deployment commands.

Install dependencies:

```sh
npm install
```

Run the Worker locally:

```sh
npm run dev
```

Generate the destination manifest explicitly:

```sh
npm run generate:destinations
```

The manifest is also generated automatically before `dev`, `deploy`, `typecheck`, and `test`. Wrangler also runs the same generator through its `build.command`, so direct `wrangler deploy` runs have the manifest available at bundle time.

## Testing

Run all checks:

```sh
npm run check
```

Run TypeScript only:

```sh
npm run typecheck
```

Run tests only:

```sh
npm test
```

Run a deploy dry-run:

```sh
npm run deploy:dry-run
```

The resolver tests cover:

- shortcut resolution
- jurisdiction-specific resolution
- case-insensitive path matching
- declared top-level and sub-jurisdiction aliases
- duplicate redirect ID rejection
- non-HTTP target rejection
- unresolved path behavior

Before deploying a material change, run:

```sh
npm run check
npm run deploy:dry-run
```

## Adding Destinations

Add one `.ts` file per redirect target under `src/redirects/destinations/`. No index or registry edit is required.

Each destination file must default-export `defineRedirectDestination(...)`.

Destination files may use:

- shortcut routes with string segments or local alias arrays
- jurisdiction routes that start with declared jurisdiction segments from `src/redirects/jurisdictions`

Example:

```ts
import { defineRedirectDestination } from "../types";
import { aus } from "../jurisdictions";

export default defineRedirectDestination({
  id: "aus-fca",
  target: "https://www.fedcourt.gov.au/",
  description: "Federal Court of Australia",
  routes: [
    {
      segments: [aus.root, "fca"],
      kind: "jurisdiction",
    },
  ],
});
```

Each destination can define multiple route aliases:

```ts
import { defineRedirectDestination } from "../types";
import { us } from "../jurisdictions";

export default defineRedirectDestination({
  id: "scotus",
  target: "https://www.supremecourt.gov/",
  description: "Supreme Court of the United States",
  routes: [
    {
      segments: ["scotus"],
      kind: "shortcut",
    },
    {
      segments: [us.root, "scotus"],
      kind: "jurisdiction",
    },
  ],
});
```

Route fields:

- `id`: stable unique identifier for the destination.
- `target`: absolute `https://` or `http://` URL.
- `description`: human-readable target name.
- `routes`: one or more path definitions.
- `segments`: path parts without slashes, using strings or segment alias arrays.
- `kind`: `"shortcut"` for direct shortcuts or `"jurisdiction"` for jurisdiction paths.
- `defaultStatus`: optional redirect status for all routes in the file.
- `status`: optional route-specific redirect status.
- `preserveQuery`: optional boolean. Defaults to `true`.

Supported redirect status values are `301`, `302`, `307`, and `308`. The default is `302`.

## Jurisdictions And Aliases

Jurisdiction segments are explicit. Each top-level jurisdiction can have its own file under `src/redirects/jurisdictions/`; current files are `us.ts` and `aus.ts`.

Example jurisdiction file:

```ts
import { defineJurisdictionSegment } from "../types";

export const us = {
  root: defineJurisdictionSegment("us", ["usa", "united-states"]),
  ca: defineJurisdictionSegment("ca", ["cal", "california"]),
} as const;
```

Jurisdiction routes must start with a declared jurisdiction segment. This is checked by TypeScript during `npm run typecheck`.

```ts
import { us } from "../jurisdictions";

segments: [us.root, us.ca, "court"]
```

That single route can be reached through paths such as:

- `/us/ca/court`
- `/us/cal/court`
- `/usa/california/court`

Shortcut routes can still use local alias arrays:

```ts
segments: [["court", "ct"]]
```

Jurisdiction alias arrays cannot be declared directly inside destination files. Add the jurisdiction segment or alias to the relevant top-level jurisdiction file instead. This is exempt from the one-file destination rule because it updates shared jurisdiction vocabulary.

Aliases are expanded when the Worker module initializes. Request-time redirect lookup remains a normalized single-key map lookup.

## Runtime Path

The redirect runtime is intentionally small:

- destination files are imported through a generated manifest
- route aliases are expanded once during module initialization
- redirect targets are parsed once during module initialization
- each request extracts only the path and query string from the request URL
- each redirect request performs one normalized map lookup
- redirect responses are constructed directly with `Response` and a `Location` header

This keeps Cloudflare CPU work low while preserving the single-file destination authoring model.

## Cloudflare Configuration

The Worker is configured in `wrangler.jsonc`.

Important fields:

- `name`: Worker name, currently `see-infra`.
- `main`: Worker entrypoint, currently `src/index.ts`.
- `compatibility_date`: runtime compatibility date.
- `workers_dev`: set to `false` so deployment uses the configured custom domain instead of a `workers.dev` URL.
- `build.command`: runs `npm run generate:destinations` before Wrangler bundles the Worker.
- `routes`: attaches the Worker to the custom domain `see.etseq.co`.
- `custom_domain`: set to `true`, so Cloudflare treats the Worker as the origin for `see.etseq.co` and manages the required DNS/certificate plumbing.
- `observability.enabled`: enables Cloudflare Workers observability.

Deployment expects:

- Cloudflare account access to the `etseq.co` zone.
- A configured Wrangler login or `CLOUDFLARE_API_TOKEN`.
- A configured `HEALTHCHECK_TOKEN` Worker secret if the `/__health` endpoint will be used.
- No manual `see.etseq.co` DNS record with the same hostname. If a previous route-based setup created a proxied `A`, `AAAA`, or `CNAME` record for `see`, remove it before using the custom domain.

Deploy:

```sh
npm run deploy
```

Dry-run deploy:

```sh
npm run deploy:dry-run
```

When adding environment-specific settings later, prefer Wrangler `env` blocks rather than branching in Worker code.

## Health Check

`/__health` is intentionally not public. It returns `404` unless the request includes an `x-health-token` header matching the `HEALTHCHECK_TOKEN` Worker secret. A valid health check returns only:

```json
{
  "status": "ok"
}
```

Set the secret with:

```sh
wrangler secret put HEALTHCHECK_TOKEN
```

Example request:

```sh
curl -H "x-health-token: $HEALTHCHECK_TOKEN" https://see.etseq.co/__health
```

## Generated Files

`src/redirects/destinations/manifest.generated.ts` is generated and ignored by git. It imports every destination file and exports `redirectDefinitions` for the resolver.

Regenerate it with:

```sh
npm run generate:destinations
```

## License

This repository is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International Public License. See `LICENSE`.

Canonical license URL: https://creativecommons.org/licenses/by-nc-sa/4.0/

## Attribution

Coding work attribution: OpenAI Codex.
