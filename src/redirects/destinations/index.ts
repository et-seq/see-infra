import { scotusDestination } from "./scotus";
import type { RedirectDefinition } from "../types";

// Central destination registry.
//
// To add a destination:
// 1. Create one file in this directory, e.g. `fca.ts`.
// 2. Import it here and append it to `redirectDefinitions`.
//
// Shortcut routes and jurisdiction-specific routes both live in the destination
// file, so a target with several aliases still has a single source of truth.
export const redirectDefinitions = [
  scotusDestination,
] as const satisfies readonly RedirectDefinition[];
