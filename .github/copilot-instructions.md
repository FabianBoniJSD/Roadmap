# GitHub Copilot Instructions

**Project**: SharePoint-backed Next.js 14 (pages router) roadmap application  
**Stack**: Next.js 14, TypeScript, Tailwind CSS, PnP JS, PM2  
**Goal**: Enable immediate contributions to a legacy SharePoint integration without breaking resilience patterns

## Architecture

### Data Layer (Two Services)

**1. `utils/clientDataService.ts`** (Primary - use for all new features)

- Fetch-based proxy through `/api/sharepoint` route
- Handles legacy SharePoint: OData nometadata/verbose/Atom XML cascade
- Dynamic field probing, list title resolution (spaces vs no-spaces)
- Auto-discovers alternate category field names via field metadata
- **Use for**: All API routes, server components, cross-version compatibility

**2. `utils/dataService.ts`** (Legacy PnP JS)

- Server-side `@pnp/sp` wrapper (assumes modern REST)
- **Use for**: Bulk operations where PnP already works; avoid new fallback logic

**Pattern**: API route → `clientDataService` → proxy → SharePoint REST

### SharePoint Lists (dual naming)

```typescript
const SP_LISTS = {
  PROJECTS: 'RoadmapProjects', // aka 'Roadmap Projects'
  CATEGORIES: 'RoadmapCategories', // aka 'Roadmap Categories'
  SETTINGS: 'RoadmapSettings', // aka 'Roadmap Settings'
  TEAM_MEMBERS: 'RoadmapTeamMembers', // aka 'Roadmap Team Members'
  PROJECT_LINKS: 'RoadmapProjectLinks', // aka 'Roadmap Project Links'
};
```

Use `clientDataService.resolveListTitle(preferred, [variants])` to handle naming inconsistencies.

### Data Flow

1. Fetch base projects (includes fields like Category, Status, ProjectFields)
2. Parallel fetch related lists (links, team members)
3. Client-side join via `ProjectId` lookup (see `getAllProjects()`)
4. Derive missing `startDate`/`endDate` from quarters using canonical function

## Critical Patterns (DO NOT MODIFY)

### OData Fallback Cascade (`clientDataService.fetchFromSharePoint`)

1. Try `application/json;odata=nometadata`
2. On 400/InvalidClientQuery → retry `odata=verbose`
3. On failure → try `application/atom+xml` + parse XML
4. Cache working approach per request

### Field Probing

- When `$select` fails, probe each field individually
- Cache valid set in `_validProjectFields` instance var
- **Add new fields to `candidateFields` array only** (line ~344) - probing validates automatically

### Category Normalization (in `pages/api/projects/index.ts` + `clientDataService.ts`)

```typescript
const trimmed = category.trim();
const normalized = /^\d+\.0$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed;
```

Preserves "7.0" → "7" collapse. Apply to all category fields.

### Quarter → Date Derivation (exact implementation in both services)

```typescript
const derive = (q: string, end = false): string => {
  const year = new Date().getFullYear();
  const mapping = {
    Q1: [0, 1, 0, 0, 0, 0],
    Q2: [3, 1, 0, 0, 0, 0],
    Q3: [6, 1, 0, 0, 0, 0],
    Q4: [9, 1, 0, 0, 0, 0],
  };
  const [month, day] = end
    ? [mapping[q]?.[0] + 2 || 2, [31, 30, 30, 31][['Q1', 'Q2', 'Q3', 'Q4'].indexOf(q)] || 31]
    : [mapping[q]?.[0] || 0, 1];
  return new Date(
    Date.UTC(year, month, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0)
  ).toISOString();
};
```

Copy from `dataService.ts` (line ~108-130) if adding to new service.

## Authentication

### Modes (`SP_STRATEGY` / `NEXT_PUBLIC_SP_AUTH_MODE`)

- `kerberos` - Server-side SPNEGO via `curl --negotiate` (requires `SP_USE_CURL=true`)
- `fba` - Forms-based auth
- `basic` - Basic auth header (only if supported by the SharePoint/IIS config)

**Kerberos**: SharePoint proxy runs in curl mode only.

### Admin Authorization

```typescript
const isAdmin = await clientDataService.isCurrentUserAdmin();
```

Checks: (1) Site Collection Admin (`IsSiteAdmin`), (2) Owners Group, (3) Heuristic (groups with "Owner"/"Besitzer").

**Deprecated**: `RoadmapUsers` list removed (see `docs/ADMIN_AUTH_CHANGES.md`).

## Development Workflow

### Scripts

- `npm run dev` - Dev server (port 3000)
- `npm run build` - Production build
- `npm run lint:fix` - ESLint auto-fix
- `npm run format` - Prettier format
- `npm run security:audit` - Vulnerability check
- `npm run pm2:restart` - Restart PM2 process

### Pre-commit (Husky + lint-staged)

Auto-runs ESLint fix, Prettier, security audit. Configured in `package.json` `lint-staged`.

### Environment Variables

- `NEXT_PUBLIC_DEPLOYMENT_ENV` - Controls `dev`/`production` mode
- `INTERNAL_API_BASE_URL` - Server-side absolute URL for fetch (SSR)
- `SP_STRATEGY` - Auth mode
- `NEXT_PUBLIC_BASE_PATH_PROD/DEV` - App base path (reverse proxy subdir)

**Never hardcode URLs** - use `resolveSharePointSiteUrl()` or `clientDataService.getWebUrl()`.

### Deployment

- **Platform**: Self-hosted Windows GitHub runner
- **Process Manager**: PM2 (`ecosystem.config.js` - port 3000)
- **Build output**: `.next` directory
- **Config**: `next.config.mjs` sets `basePath`, `trailingSlash: false`

## API Route Pattern

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const disableCache = () => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  };

  if (req.method === 'GET') {
    disableCache();
    const data = await clientDataService.getAllProjects();
    res.status(200).json(data);
  } else if (req.method === 'POST') {
    disableCache();
    if (!(await clientDataService.isCurrentUserAdmin())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const item = await clientDataService.createProject(req.body);
    res.status(201).json(item);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

### Caching

- In-memory only: list titles, field metadata, request digest (with expiration)
- Parallel fetches: Use `Promise.all` for related lists

## Component Patterns

### Admin HOC

```typescript
export default withAdminAuth(MyAdminPage);
```

Redirects to `/admin/login` if `hasAdminAccess()` returns false (see `components/withAdminAuth.tsx`).

### UI

- Components: `components/**` (no data layer logic)
- Types: `types/index.ts` (sync with both data services)
- Styling: Tailwind CSS

## Rules

### DO

- Use `clientDataService` for all new API routes
- Batch independent operations with `Promise.all`
- Add new SharePoint lists to both `SP_LISTS` and `ALLOWED_LISTS` (proxy route)
- Preserve existing fallback/retry mechanisms
- Use optional chaining + defensive defaults for SharePoint fields

### DO NOT

- Modify quarter derivation logic
- Duplicate admin check logic
- Mix PnP and fetch for same entity
- Add UI logic to data services
- Remove existing OData/XML fallback paths
- Hardcode SharePoint URLs

## Quick Reference

| Task                     | Solution                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Fetch projects           | `await clientDataService.getAllProjects()`                                          |
| Check admin              | `await clientDataService.isCurrentUserAdmin()`                                      |
| Add new field            | Append to `candidateFields` array (~line 344 in `clientDataService.ts`)             |
| Normalize category       | Trim + collapse "X.0" → "X" (see pattern above)                                     |
| Derive date from quarter | Copy `derive()` from `dataService.ts` line ~108                                     |
| Resolve list title       | `await clientDataService.resolveListTitle('RoadmapProjects', ['Roadmap Projects'])` |
| Auth mode                | `getAuthMode()` in `utils/authMode.ts`                                              |

**Reference**: See `docs/ADMIN_AUTH_CHANGES.md` for admin migration details, `README.md` Kerberos section for auth setup.
