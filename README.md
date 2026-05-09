# see-infra

Cloudflare Worker redirector for `see.etseq.co/*`.

## Implemented Routes

- `https://see.etseq.co/scotus` -> `https://www.supremecourt.gov/`
- `https://see.etseq.co/us/scotus` -> `https://www.supremecourt.gov/`

The `us` and `aus` top-level jurisdictions are declared in `src/redirects/jurisdictions.ts`. The Australia jurisdiction currently has no concrete redirect targets.

Route matching is case-insensitive.

## Development

```sh
npm install
npm run dev
npm run check
```

Deploy with:

```sh
npm run deploy
```

## Adding Destinations

Add one file per redirect target under `src/redirects/destinations/`. The registry is generated automatically before development, test, typecheck, and deploy runs.

Each redirect target can define multiple route aliases, so shortcut and jurisdiction-specific paths can point to the same destination without duplicating resolver logic.

This keeps each new destination to one new `.ts` file.

Jurisdiction routes should use canonical jurisdiction slugs. Sub-jurisdiction aliases are resolved automatically, so a route defined as `["us", "ca", "court"]` can be reached through paths such as `/us/ca/court`, `/us/cal/court`, or `/usa/california/court`. Current sub-jurisdiction metadata includes California under `us` and Victoria under `aus`.

Example destination file:

```ts
import { defineRedirectDestination } from "../types";

export default defineRedirectDestination({
  id: "aus-fca",
  target: "https://www.fedcourt.gov.au/",
  description: "Federal Court of Australia",
  routes: [
    {
      segments: ["aus", "fca"],
      kind: "jurisdiction",
    },
  ],
});
```
