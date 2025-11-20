# GitHub Copilot Instructions

**Project**: SharePoint-backed Next.js 14 (pages router) roadmap application  
**Goal**: Enable immediate, productive contributions without inventing abstractions

## Architecture Overview

### Data Layer Strategy

Two parallel SharePoint access layers with distinct purposes:

1. **`utils/clientDataService.ts`** (Primary for new features)

   - Resilient fetch-based proxy via `/api/sharepoint` route
   - Handles legacy SharePoint farms: multiple OData modes, Atom XML fallback
   - Dynamic field probing, alternate list title resolution, field capability detection
   - **Use for**: All API routes, SSR contexts, anything that needs cross-version compatibility

2. **`utils/dataService.ts`** (Legacy PnP JS)
   - Server-side `@pnp/sp` wrapper assuming modern REST
   - **Use for**: Simple CRUD where PnP already works; avoid adding new fallback logic

**Default pattern**: API routes (`pages/api/**`) → `clientDataService` (see `pages/api/projects/index.ts`)

### SharePoint Lists

Active lists (note dual naming - spaces vs no-spaces):

- `RoadmapProjects` / `Roadmap Projects` - Core project data
- `RoadmapCategories` / `Roadmap Categories` - Project categories
- `RoadmapSettings` / `Roadmap Settings` - App configuration
- `RoadmapTeamMembers` / `Roadmap Team Members` - Joined to projects
- `RoadmapProjectLinks` / `Roadmap Project Links` - Joined to projects

**Resolution**: Use `clientDataService.resolveListTitle(preferred, [variants])` to handle naming inconsistencies

### Data Flow Pattern

Projects are enriched client-side after base fetch:

```typescript
// 1. Fetch base projects
// 2. Fetch related lists in parallel (links, team members)
// 3. Join via ProjectId lookup (see getAllProjects implementation)
```

**Keep this pattern**—avoid N+1 queries

## Critical Resilience Patterns

### OData Fallback Cascade

All SharePoint requests follow this sequence (in `clientDataService.fetchFromSharePoint`):

1. Try `Accept: application/json;odata=nometadata`
2. On 400/InvalidClientQuery → retry with `odata=verbose`
3. On failure for item collections → try `application/atom+xml` and parse XML
4. Cache valid approach per request pattern

### Field Probing

When $select fails, individually probe each field, cache valid set (`_validProjectFields` instance variable), reuse cached set. Add new fields to `candidateFields` array (line ~344 in `clientDataService.ts`) only—probing validates automatically. Never manually update the cache.

### Category Normalization

```typescript
// Trim whitespace, collapse numeric decimals ("7.0" → "7")
const normalized = /^\d+\.0$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed;
```

Present in both `pages/api/projects/index.ts` and `clientDataService`. Preserve for all derived fields.

## Authentication & Authorization

### Auth Modes

Controlled via `SP_STRATEGY` / `NEXT_PUBLIC_SP_AUTH_MODE` env vars:

- **`kerberos`**: Browser SPNEGO negotiation (no server-side auth headers)
- **`onprem`**: NTLM (server constructs auth headers)
- **`fba`**: Forms-based auth

**Kerberos specifics**: Server does NOT inject `Authorization` headers. Proxy route (`pages/api/sharepoint/[...sp].ts`) sets `x-sp-auth-mode: kerberos` diagnostic header. Browser performs ticket negotiation.

### Admin Access (Post-Migration)

**Never create custom admin logic**—use centralized check:

```typescript
const isAdmin = await clientDataService.isCurrentUserAdmin();
```

Checks in order:

1. Site Collection Admin (`IsSiteAdmin` property)
2. Associated Owners Group membership
3. Heuristic: Groups with "Owner"/"Besitzer" in title

**Deprecated**: `RoadmapUsers` list, `authenticateUser()`, `authenticateWithSharePoint()` (see `docs/ADMIN_AUTH_CHANGES.md`)

## Environment & Configuration

### Key Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without changes
- `npm run security:audit` - Run npm security audit
- `npm run ntlm:diag` - NTLM diagnostic script
- `npm run pre-commit` - Run lint-staged (executed automatically via Husky)

### Pre-Commit Hooks

Git hooks via Husky in `.husky/pre-commit`:

1. **lint-staged** - Auto-fixes ESLint, removes unused imports, formats with Prettier
2. **Security audit** - Non-blocking vulnerability warnings

Configured via `lint-staged` in `package.json`, formatting rules in `.prettierrc`.

### Environment Variables

- `NEXT_PUBLIC_DEPLOYMENT_ENV` - Controls site selection (dev/production)
- `NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV/PROD` - Site URLs (in `spConfig.ts`)
- `INTERNAL_API_BASE_URL` - Server-side API base for absolute URL construction
- `SP_STRATEGY` / `NEXT_PUBLIC_SP_AUTH_MODE` - Authentication mode

**Never hardcode SharePoint URLs**—use `resolveSharePointSiteUrl()`, `getSP()`, or `clientDataService.getWebUrl()`

### Deployment

- **Platform**: Self-hosted Windows runner (GitHub Actions `.github/workflows/deploy.yml`)
- **Process Manager**: PM2 (`ecosystem.config.js`)
- **Port**: 3000
- **Build**: `next build` produces `.next` directory
- **basePath**: Controlled by `NEXT_PUBLIC_BASE_PATH_PROD/DEV` in `next.config.mjs`

## Data Conventions

### Quarter to Date Derivation

When `startDate`/`endDate` missing, derive from quarters using **this exact logic** (do not invent variations):

```typescript
const derive = (q: string, end = false): string => {
  const year = new Date().getFullYear();
  switch (q) {
    case 'Q1':
      return end
        ? new Date(Date.UTC(year, 2, 31, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 0, 1)).toISOString();
    case 'Q2':
      return end
        ? new Date(Date.UTC(year, 5, 30, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 3, 1)).toISOString();
    case 'Q3':
      return end
        ? new Date(Date.UTC(year, 8, 30, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 6, 1)).toISOString();
    case 'Q4':
      return end
        ? new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString()
        : new Date(Date.UTC(year, 9, 1)).toISOString();
    default:
      return new Date(Date.UTC(year, 0, 1)).toISOString();
  }
};
```

Present in both `dataService.ts` and should be in `clientDataService.ts`

### Multi-Valued Fields (`ProjectFields`)

Accept: string, array, newline-separated, semicolon-separated, comma-separated  
Normalize to: `string[]`

```typescript
// Keep parsing logic identical across both services
if (typeof rawPF === 'string') {
  if (rawPF.includes('\n'))
    fields = rawPF
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  else if (rawPF.includes(';') || rawPF.includes(','))
    fields = rawPF
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  else fields = [rawPF.trim()];
}
```

### Status Normalization

Convert to lowercase canonical set using substring checks (see `dataService.ts` `statusMap`):

- `planned`, `in-progress`, `completed`, `paused`, `cancelled`
- **Reuse existing function**—do not re-implement

### Legacy Field Tolerance

Legacy SharePoint farms may lack modern columns. Always:

- Use optional chaining: `item.Field?.NestedField`
- Provide defensive defaults: `|| ''`, `|| 0`, `|| []`
- Never assume field presence

## API Route Patterns

### Standard Structure

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cache disabling helper (define inline or reuse from other routes)
  const disableCache = () => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    const maybeRemovable = res as NextApiResponse & { removeHeader?: (name: string) => void };
    if (typeof maybeRemovable.removeHeader === 'function') maybeRemovable.removeHeader('etag');
  };
  
  if (req.method === 'GET') {
    try {
      const data = await clientDataService.someMethod();
      res.setHeader('x-diagnostic-count', String(data.length)); // Helpful diagnostics
      res.status(200).json(data);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Generic message' }); // Never leak internals
    }
  }
  // POST/PUT/DELETE follow same pattern with admin check
  else if (req.method === 'POST') {
    disableCache();
    if (!(await clientDataService.isCurrentUserAdmin())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // ... write logic
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

### Caching Strategy

- **In-memory only**: List titles, field metadata, request digest (with expiration)
- **No persistent layer** unless requirements change
- Use `Promise.all` for parallel fetches to reduce latency

## Component Patterns

### Admin HOC

Wrap admin pages with `withAdminAuth` HOC (`components/withAdminAuth.tsx`):

```typescript
export default withAdminAuth(AdminComponent);
```

Handles redirect to `/admin/login` if unauthorized

### UI Conventions

- React components in `components/**` - no data layer logic here
- Types in `types/index.ts` - keep synchronized with both data services
- Styling: Tailwind CSS classes

## Change Guidelines

### When Modifying Code

- **Minimal patches**: Do not reformat large files (pre-commit hooks handle formatting)
- **Reuse helpers**: Avoid duplication (especially auth, normalization, derive functions)
- **Preserve fallbacks**: Never remove retry paths unless replacing with equivalent
- **Use env vars**: No hardcoded URLs/credentials
- **Parallel operations**: Batch independent operations with `Promise.all`
- **Security**: Use `@xmldom/xmldom` (not deprecated `xmldom`), keep dependencies updated

### When Adding Features

- API routes → `clientDataService` (unless simple PnP bulk op)
- New fields → append to `candidateFields`, rely on probing
- New SharePoint lists → add to both `clientDataService.SP_LISTS` and `pages/api/sharepoint/[...sp].ts` ALLOWED_LISTS

### What NOT to Do

- Invent new quarter derivation logic
- Duplicate admin check logic
- Mix PnP and fetch for same entity in one endpoint
- Add UI logic to data services
- Remove existing fallback/retry mechanisms
- Create new persistent caching without discussion

## Quick Reference

| Task                | File/Pattern                                         |
| ------------------- | ---------------------------------------------------- |
| Fetch projects      | `clientDataService.getAllProjects()`                 |
| Admin check         | `clientDataService.isCurrentUserAdmin()`             |
| Add new field       | Append to `candidateFields` array                    |
| Normalize category  | Trim + collapse "X.0" → "X"                          |
| Auth mode           | Check `getAuthMode()` in `utils/authMode.ts`         |
| Derive quarter date | Copy `derive()` from `dataService.ts`                |
| Resolve list title  | `clientDataService.resolveListTitle(name, variants)` |

**Missing pattern?** Request clarification from maintainers—do not invent silently.
