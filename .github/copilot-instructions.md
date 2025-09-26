## AI Assistant Project Guide

Purpose: Enable immediate productive contributions to this SharePoint‑backed Next.js 14 (pages router) roadmap application. Focus on real patterns present in the code; do not invent abstractions.

### Architecture & Data Flow
* SharePoint is the system of record. Two parallel access layers exist:
  * `utils/clientDataService.ts`: Resilient fetch-based proxy through Next API route `/api/sharepoint` (handles legacy farms, multiple OData modes, Atom XML fallback, dynamic field probing, alternate list title resolution, runtime field capability detection, category field heuristics, and multi-step fallbacks). Prefer this for API routes that must run both server and (potentially) during SSR.
  * `utils/dataService.ts`: PnP JS (`@pnp/sp`) server-side wrapper (simpler, assumes modern REST behavior). Avoid adding complex fallback logic here; keep parity only for operations already implemented.
* API layer (under `pages/api/**`) mostly calls `clientDataService` now (e.g. `pages/api/projects/index.ts` GET). When adding endpoints, follow that pattern unless a PnP bulk operation is clearly simpler.
* Lists: canonical names sometimes contain spaces (PnP side, see `spConfig.ts` `SP_LISTS`), while client fetch layer uses condensed variants without spaces (e.g. `RoadmapProjects`). Always verify or resolve via `clientDataService.resolveListTitle` if uncertain.
* Project enrichment: After base project fetch, links (`RoadmapProjectLinks`) and team members (`RoadmapTeamMembers`) are joined client-side (see aggregation near end of `getAllProjects`). Maintain this pattern; avoid N+1 roundtrips.

### Resilience & Fallback Patterns
* Always request `Accept: application/json;odata=nometadata` first; on 400 / InvalidClientQuery retry with `odata=verbose`; finally, if still failing for list item collections, try `application/atom+xml` and parse (see `fetchFromSharePoint`).
* Dynamic field probing (projects): On select failure, probe each field individually, cache valid set (`_validProjectFields`) and reuse; keep new fields appended to `candidateFields` list only.
* Category normalization: Treat numeric-like strings with decimals ("7.0") as integers; trim whitespace (`pages/api/projects/index.ts` + within `clientDataService`). Preserve this logic for any new derived fields.
* Alternate category field detection: If all Category values empty, fetch field metadata and look for internal names / titles matching `/kategor|categor/i` and backfill `Category` (see probe block). Reuse that utility flow if creating similar heuristics for other fields.

### Auth & Security
* Authentication against SharePoint Users list; token is custom HMAC (NOT JWT) (`utils/auth.ts`). If expanding auth, keep backward compatibility with `generateTokenLegacy` and `validateTokenLegacy` until explicitly removed.
* Admin checks: Use `clientDataService.isCurrentUserAdmin()` (see API POST project creation). Do not duplicate role logic.
* Kerberos vs NTLM: Mode controlled via env (`SP_STRATEGY`, `NEXT_PUBLIC_SP_AUTH_MODE`). In Kerberos mode, server does NOT inject `Authorization` headers; rely on browser negotiation (see README Kerberos section). Any new proxy code must respect `x-sp-auth-mode` header patterns.

### Environment & Config
* Scripts: `npm run dev`, `build`, `start`, `lint`, plus `ntlm:diag` (diagnostic script for NTLM). Reference these directly in automation examples.
* SharePoint site selection via `NEXT_PUBLIC_DEPLOYMENT_ENV` and site URL env vars in `spConfig.ts`. Never hardcode full SharePoint URLs—use helpers (`resolveSharePointSiteUrl`, `getSP`, or `clientDataService.getWebUrl()` mechanics).
* Internal API base for server contexts: `INTERNAL_API_BASE_URL` used in API fallbacks to craft absolute URLs when no host headers (see projects endpoint fallback block). Preserve trailing slash removal and proto inference logic.

### Conventions & Data Normalization
* Project quarter to date derivation: Always derive ISO dates if missing via the standard Q1–Q4 map (copy existing `derive` function—do not introduce new variations).
* Multi-valued textual custom fields (`ProjectFields`): Accept string, array, newline, semicolon, or comma separated; normalize to string array (see both services). Maintain identical parsing rules.
* Status normalization: Convert to lower-case canonical set (planned, in-progress, completed, paused, cancelled) using substring checks (see `dataService.statusMap`). Reuse function; do not re-implement ad hoc.
* Do not assume presence of modern fields—legacy farms may omit newer columns; keep optional chaining and defensive defaulting (empty string, 0, or arrays) consistent.

### Adding / Modifying API Routes
* Pattern: Validate method, wrap logic in try/catch, add diagnostic headers where helpful (e.g., counts in `projects` GET). Keep responses pure JSON; never leak internal errors beyond generic message.
* For writes: Use `clientDataService` methods where they already exist; otherwise extend it with OData POST logic including request digest retrieval (`getRequestDigest`). Avoid mixing PnP and raw fetch for the same entity in one endpoint.

### Performance & Caching
* In-memory runtime caches only (list title, metadata type, request digest with expiration, field name sets). Do not introduce persistent layer unless requirement changes.
* Batch additional related lookups only if they reduce extra sequential network calls; maintain parallel `Promise.all` patterns already used.

### When to Touch Which Layer
* Add resilience / cross-version compatibility logic -> `clientDataService`.
* Simple CRUD where PnP already robust -> `dataService`.
* UI-specific formatting or grouping -> React components (`components/**`) not data layer.

### Examples
* Fetch projects (server/API): `const projects = await clientDataService.getAllProjects();`
* Resolve list title variant: `await clientDataService['resolveListTitle']('RoadmapProjects',['Roadmap Projects']);`
* Add new selectable field: append to `candidateFields` array; rely on probing to validate.

### PR / Change Guidance for AI
* Keep patches minimal; do not reformat large files.
* Reuse existing helper functions; avoid code duplication.
* Preserve fallbacks and header behaviors; never remove an existing retry path unless replacing with equivalent logic.
* Include environment variable references instead of literals for host/site values.

Request clarification from maintainers if a needed pattern (tests, logging standard, error taxonomy) is absent—do not invent one silently.
