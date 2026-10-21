# SharePoint Roadmap (Next.js 15)

SharePoint-backed roadmap application built with Next.js 15 (pages router), TypeScript, Tailwind CSS, and PM2. It integrates with SharePoint via resilient fetch fallbacks and supports Kerberos (SPNEGO), tightly scoped delegated access, and optional basic auth.

## Tech Stack

- Next.js 15 (pages router), React 18, TypeScript
- Tailwind CSS for styling
- SharePoint REST with custom fetch fallback
- Prisma (included, optional) and PM2 for process management

## Architecture

- **API pattern**: Next.js API route → `utils/clientDataService` → `/api/sharepoint` proxy → SharePoint REST.
- **Data layer**: `clientDataService` handles SharePoint access (OData nometadata → verbose → Atom XML cascade, field probing, caching).
- **SharePoint lists**: `Roadmap Projects`, `Roadmap Categories`, `Roadmap Settings`, `Roadmap Team Members`, `Roadmap Project Links`.
- **Category normalization**: trim and collapse values like `7.0` → `7` across API and client data service.
- **Quarter → date derivation**: shared helper maps Q1–Q4 to start/end ISO dates; do not change logic.
- **Authorization**: exact Entra/UPN/on-prem identities plus live SharePoint role checks; display names never grant access.
- **Rate limits**: shared, persistent Prisma buckets for public APIs.

## Setup

1. **Requirements**: Node 22.20.0 and Yarn 1.22.22. Run `corepack enable` if Yarn isn't available yet.
2. **Install**: `yarn install --frozen-lockfile`.
3. **Env**: copy `.env.example` to `.env` and set values. Key vars:
   - `NEXT_PUBLIC_DEPLOYMENT_ENV` (`dev`|`production`)
   - `INTERNAL_API_BASE_URL` (absolute server URL for SSR fetches)
   - `PUBLIC_PROJECTS_API_KEYS` (comma-separated keys for `/api/public/projects`; `ROADMAP_API_KEY` is supported as a single-key alias and can come from GitHub Secrets)
   - `SP_STRATEGY` (deprecated for proxy; Kerberos is the hardcoded default)
   - `SP_USE_CURL` (deprecated; Kerberos proxy uses curl unconditionally)
   - `NEXT_PUBLIC_BASE_PATH_DEV` / `NEXT_PUBLIC_BASE_PATH_PROD` (reverse proxy base paths)
   - SharePoint site/web URLs and credentials for the active strategy (see `utils/sharepointEnv.ts`).
4. **Run dev**: `yarn dev` (port 3000, Turbo mode enabled via `next dev --turbo`).
5. **Build**: `yarn build`; **start**: `yarn start`.

### Local PostgreSQL with Docker

Start a PostgreSQL 16 development database with the Prisma baseline schema and the sample roadmap seed:

```bash
docker compose up -d --build
```

Use this connection string in `.env`:

```dotenv
DATABASE_URL="postgresql://roadmap:roadmap_dev@localhost:5433/roadmap?schema=public"
```

The seed creates the `sample` instance, sample feedback including one completed feature, and votes. Its `sampleData` feature serves the development categories and projects from `utils/sampleInstanceData.ts`. Initialization runs only for a new Docker volume. To deliberately recreate the database from scratch, run `docker compose down -v` before starting it again. The database name, user, password, and host port can be overridden with `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_PORT`.

## Auth Modes

- **kerberos**: Server proxy uses `curl --negotiate` (hardcoded; no `SP_USE_CURL` flag required).
- **basic**: Basic auth header (only if your SharePoint supports it).
- **delegated**: forward authenticated user context when the surrounding setup supports it.

## Development Workflow

- Lint: `yarn lint` (fix: `yarn lint:fix`).
- Format: `yarn format` (check: `yarn format:check`).
- Security audit: `yarn security:audit`.
- Prisma: `yarn prisma:generate | migrate | deploy | studio | seed`.
- Sensitive diagnostics are disabled by default and forbidden in production.
- PM2 ops: `yarn pm2:restart | yarn pm2:stop | yarn pm2:logs | yarn pm2:status` (see `ecosystem.config.js`).

## Implementation Documentation

- [`docs/CI_CD_PIPELINE_PORTING_SPEC.md`](docs/CI_CD_PIPELINE_PORTING_SPEC.md): LLM-ready contract for reproducing the repository's branch validation, security gates, protected self-hosted deployment, and sanitized mirror in another repository.
- [`docs/SSO_PORTING_SPEC.md`](docs/SSO_PORTING_SPEC.md): canonical, LLM-ready specification for reproducing the current Microsoft Entra SSO flow in another application.
- [`docs/ENTRA_SSO_IMPLEMENTATION.md`](docs/ENTRA_SSO_IMPLEMENTATION.md): architecture narrative and implementation history.
- [`docs/SECURITY_AUDIT_REPORT.md`](docs/SECURITY_AUDIT_REPORT.md): authoritative findings, remediations, residual external actions, and verification evidence.

## Support via Orbit

- The floating Support link opens `https://orbit.jsd.bs.ch` in a separate tab. The activity button sits directly above it.
- The local chat widget, polling, inbox and message handling have been retired. `/admin/support-chat` redirects to Orbit; legacy chat API routes return `410 Gone` without accessing the database or creating cookies.
- Historical chat tables and migrations are retained to preserve existing records. No chat data is forwarded to Orbit.

## Recent Activity

- Successful authenticated create, update, reorder, upload, vote, and delete requests are stored in `AuditEvent`; request bodies, headers, query values, and IP addresses are never copied into the audit record.
- The activity indicator above Orbit polls every 15 seconds while the tab is visible. Its feed is authenticated, permission-checked, and limited to `visibility = instance` events for the active roadmap instance.
- Admin, support, and security events remain outside the shared instance feed. New deployments must apply the audit table with `yarn prisma:deploy` before restarting the application.

## Conventions and Guardrails

- Use `clientDataService` for new APIs; add new fields only to `candidateFields` (probing handles validity).
- Do not alter the OData/XML fallback cascade or quarter derivation logic.
- Avoid hardcoding SharePoint URLs; use `resolveSharePointSiteUrl()` / `clientDataService.getWebUrl()`.
- Join related lists client-side via `ProjectId` (see `getAllProjects()` pattern).
- Admin pages wrap components with `withAdminAuth` HOC.

## Deployment Notes

- PM2 runs the built app on port 3000 (see `ecosystem.config.js`).
- Build output lives in `.next`; keep it out of version control.
- Production data is stored in PostgreSQL, never inside the runner checkout. Set its connection string through the protected `DATABASE_URL` secret.
- Production deployment requires a protected GitHub `production` environment and a dedicated, non-root Linux runner account named `roadmap`.
- Untrusted branch builds run on GitHub-hosted runners without production secrets. Production secrets are materialized only in the protected deployment job with mode `0600`.
- Required Microsoft Entra SSO GitHub Environment Secrets are documented in [`docs/ENTRA_SSO_IMPLEMENTATION.md`](docs/ENTRA_SSO_IMPLEMENTATION.md#cicd-und-deployment).

## Troubleshooting

- **Auth failures**: verify site URLs and credentials; for Kerberos ensure the server process has a valid SPNEGO/Kerberos context (proxy uses curl negotiate).
- **Field select errors**: rely on field probing; if adding fields, append to `candidateFields` only.
- **Categories mismatch**: ensure normalization logic is applied when writing new code.

## Security

- Never commit real secrets. `.env` and `.env.*.local` are git-ignored; keep example values non-sensitive.
