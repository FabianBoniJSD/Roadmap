# SharePoint Roadmap (Next.js 14)

SharePoint-backed roadmap application built with Next.js 14 (pages router), TypeScript, Tailwind CSS, and PM2. It integrates with SharePoint via resilient fetch fallbacks and supports Kerberos (SPNEGO) and optional FBA/basic modes.

## Tech Stack

- Next.js 14 (pages router), React 18, TypeScript
- Tailwind CSS for styling
- SharePoint REST with custom fetch fallback; PnP JS only for legacy bulk ops
- Prisma (included, optional) and PM2 for process management

## Architecture

- **API pattern**: Next.js API route → `utils/clientDataService` → `/api/sharepoint` proxy → SharePoint REST.
- **Data layer**: Prefer `clientDataService` (OData nometadata → verbose → Atom XML cascade, field probing, caching). Legacy `dataService` (PnP JS) remains for existing bulk flows.
- **SharePoint lists** (dual names handled): `RoadmapProjects`, `RoadmapCategories`, `RoadmapSettings`, `RoadmapTeamMembers`, `RoadmapProjectLinks`.
- **Category normalization**: trim and collapse values like `7.0` → `7` across API and client data service.
- **Quarter → date derivation**: shared helper maps Q1–Q4 to start/end ISO dates; do not change logic.
- **Admin check**: `clientDataService.isCurrentUserAdmin()` (site collection admin, owners group, heuristic owners).
- **Caching**: in-memory only (list titles, field metadata, request digests); avoid persistent caches.

## Setup

1. **Requirements**: Node 20.x (repo ships `node-bin` v20.11.1 if you need a pinned runtime), npm or yarn.
2. **Install**: `npm install` (or `yarn install`).
3. **Env**: copy `.env.example` to `.env` and set values. Key vars:
   - `NEXT_PUBLIC_DEPLOYMENT_ENV` (`dev`|`production`)
   - `INTERNAL_API_BASE_URL` (absolute server URL for SSR fetches)
   - `SP_STRATEGY` (`kerberos`|`fba`|`basic`)
   - `SP_USE_CURL` (`true` required for `kerberos`)
   - `NEXT_PUBLIC_BASE_PATH_DEV` / `NEXT_PUBLIC_BASE_PATH_PROD` (reverse proxy base paths)
   - SharePoint site/web URLs and credentials per auth mode (see `utils/authMode.ts`, `utils/sharepointEnv.ts`).
4. **Run dev**: `npm run dev` (port 3000).
5. **Build**: `npm run build`; **start**: `npm run start`.

## Auth Modes

- **kerberos**: Server proxy uses `curl --negotiate` (requires `SP_USE_CURL=true`).
- **fba**: Forms-based auth with cookie handling.
- **basic**: Basic auth header (only if your SharePoint supports it).

## Development Workflow

- Lint: `npm run lint` (fix: `npm run lint:fix`).
- Format: `npm run format` (check: `npm run format:check`).
- Security audit: `npm run security:audit`.
- Prisma: `npm run prisma:generate | migrate | deploy | studio | seed`.
- SharePoint auth diagnostics: use `/api/auth/whoami` and proxy debug logs.
- PM2 ops: `npm run pm2:restart | pm2:stop | pm2:logs | pm2:status` (see `ecosystem.config.js`).

## Conventions and Guardrails

- Use `clientDataService` for new APIs; add new fields only to `candidateFields` (probing handles validity).
- Do not alter the OData/XML fallback cascade or quarter derivation logic.
- Avoid hardcoding SharePoint URLs; use `resolveSharePointSiteUrl()` / `clientDataService.getWebUrl()`.
- Join related lists client-side via `ProjectId` (see `getAllProjects()` pattern).
- Admin pages wrap components with `withAdminAuth` HOC.

## Deployment Notes

- PM2 runs the built app on port 3000 (see `ecosystem.config.js`).
- Build output lives in `.next`; keep it out of version control.
- Self-hosted Windows GitHub runner expected; use `npm run pm2:restart` after deploy.

## Troubleshooting

- **Auth failures**: verify `SP_STRATEGY`, site URLs, and credentials; for Kerberos ensure browser/SPNEGO is configured.
- **Field select errors**: rely on field probing; if adding fields, append to `candidateFields` only.
- **Categories mismatch**: ensure normalization logic is applied when writing new code.

## Security

- Never commit real secrets. `.env` and `.env.*.local` are git-ignored; keep example values non-sensitive.
- Use the secrets scripts to manage encrypted config (`npm run secrets:*`).
