# Exposed Public API (API Key)

This application exposes a small **public** API surface that is protected via **API keys**.

The intent is to allow read-only consumption (e.g. dashboards, integrations) without an interactive admin login.

## Authentication

### API key sources

The API key can be provided either via:

- Header: `X-API-Key: <key>` (preferred)
- Query string: `?apiKey=<key>` (supported for simple clients)

### Configuration

Allowed keys are configured via environment variables:

- `PUBLIC_PROJECTS_API_KEYS`
  - Comma-separated list of allowed keys
  - Example: `PUBLIC_PROJECTS_API_KEYS="key1,key2,key3"`
- `ROADMAP_API_KEY`
  - Optional single-key alias
  - Useful when you want to store one key as a dedicated GitHub Actions secret

If no keys are configured, the endpoint returns `500` with `{"error":"API keys not configured"}`.

GitHub Actions support both names in `.github/workflows/deploy.yml` and `.github/workflows/branch-build.yml`.
If only `ROADMAP_API_KEY` is set as a secret, the workflow also writes it into `PUBLIC_PROJECTS_API_KEYS` inside the generated runtime `.env` for compatibility.

### Rate limiting

The endpoint rate-limits per API key:

- Limit: **500 requests per minute** per key
- Exceeded: HTTP `429` with header `Retry-After: 60`

Returned rate-limit headers:

- `X-RateLimit-Limit: 500`
- `X-RateLimit-Window: 60s`
- `X-RateLimit-Remaining: n/a` (currently not computed)

## Endpoint: Public Projects

File: [pages/api/public/projects.ts](../pages/api/public/projects.ts)

### GET `/api/public/projects`

Returns a list of projects for a given roadmap instance.

#### Query parameters

- `instance` (required): roadmap instance slug
  - Alternative alias: `roadmapInstance`
  - Required. The API no longer falls back to a global default instance.
- `category` (optional): category filter (string)
  - Category normalization applies: values matching `^\d+\.0$` are collapsed (e.g. `"7.0" → "7"`)
- `status` (optional): one or more statuses
  - Accepts a single value (`status=Active`) or comma-separated (`status=Active,Planned`)
  - Case-insensitive match
- `q` (optional): simple case-insensitive substring search across:
  - `title`, `description`, `bisher`, `zukunft`, `geplante_umsetzung`
- `all` (optional): if set to `true|1|yes|all`, skips all filters and returns all projects

#### Request examples

Header-based (recommended):

```bash
curl -s \
  -H "X-API-Key: $PUBLIC_KEY" \
  "https://<host>/api/public/projects?instance=bdm-projekte"
```

Query-string based:

```bash
curl -s "https://<host>/api/public/projects?instance=bdm-projekte&apiKey=$PUBLIC_KEY"
```

Filter example:

```bash
curl -s \
  -H "X-API-Key: $PUBLIC_KEY" \
  "https://<host>/api/public/projects?instance=bdm-projekte&category=7&status=active,planned&q=erp"
```

#### Success response (200)

```json
{
  "projects": [
    /* Project[] */
  ],
  "count": 123,
  "instance": "bdm-projekte",
  "sharePointSiteUrl": "https://..."
}
```

#### Error responses

- `401` `{"error":"Invalid API key"}`
- `404` `{"error":"Instance not found"}`
- `429` `{"error":"Rate limit exceeded (500/min)"}`
- `500` `{"error":"API keys not configured"}` or `{"error":"Failed to fetch projects"}`

### POST `/api/public/projects`

This endpoint also accepts POST, but it is **not** a data-creation API.

It responds with a `303` redirect to the admin UI project creation page for the resolved instance.

- Response header: `Location: /admin/projects/new?...`

This is mainly for convenience when a client wants to jump into the admin UI.

## Notes / Operational considerations

- Reverse proxy base paths: if this app is deployed under a Next.js `basePath`, the effective URL becomes `/<basePath>/api/public/projects`.
- API keys are currently stored as plaintext in env; rotate keys by updating `PUBLIC_PROJECTS_API_KEYS` or `ROADMAP_API_KEY` and redeploying.
- This API is read-only and uses the existing SharePoint-backed data layer (`clientDataService.getAllProjects()`).
