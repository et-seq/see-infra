# see-infra

Cloudflare Worker redirector for `see.etseq.co/*`.

## Implemented Routes

- `https://see.etseq.co/scotus` -> `https://www.supremecourt.gov/`
- `https://see.etseq.co/us/scotus` -> `https://www.supremecourt.gov/`

The `us` and `aus` top-level jurisdictions are declared in `src/redirects/jurisdictions.ts`. The Australia jurisdiction currently has no concrete redirect targets.

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

Add one file per redirect target under `src/redirects/destinations/`, then register that file in `src/redirects/destinations/index.ts`.

Each redirect target can define multiple route aliases, so shortcut and jurisdiction-specific paths can point to the same destination without duplicating resolver logic.

This keeps each new destination to a maximum of:

- one new destination file
- one edit to the central destination registry

Example destination file:

```ts
import { defineRedirectDestination } from "../types";

export const fcaDestination = defineRedirectDestination({
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
