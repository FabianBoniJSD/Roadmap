This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 Quick Start

### 1. Configure Credentials (Required!)

**First time setup?** Follow the [Quick Start Guide for Secrets](./QUICKSTART_SECRETS.md) to securely configure your SharePoint credentials.

**TL;DR**:

```bash
# Development: Copy and fill in your credentials
cp .env.example .env.local

# Production: Encrypt your secrets
npm run secrets:generate-key  # Generate master key (save it!)
# Set SECRETS_MASTER_KEY environment variable
npm run secrets:encrypt       # Encrypt .env.local → .env.vault.json
```

📖 **Detailed guides**:

- [Quick Start (5 minutes)](./QUICKSTART_SECRETS.md)
- [Complete Security Guide](./README_SECRETS.md)
- [All Environment Variables](./.env.example)

⚠️ **Admin Authentication**: This application uses **Service Account authentication** (no user login).

**🆕 Multi-User Support via GitHub Secrets**:

- Configure multiple users via `USER_<name>` secrets (e.g., `USER_FABIAN`, `USER_STEFAN`)
- All configured users automatically have admin rights
- See [Multi-User GitHub Secrets Guide](./docs/MULTI_USER_GITHUB_SECRETS.md) for setup

**Fallback**: Single service account via `SP_USERNAME`/`SP_PASSWORD` - See [Service Account Auth Docs](./docs/AUTH_MODE_SERVICE_ACCOUNT.md)

### 2. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the **Landing Page**.  
From dort kannst du:

- Eine Instanz auswählen → Cookie wird gesetzt → Weiterleitung auf `/roadmap`
- Über den CTA `Instanzen verwalten` zum Admin-Panel `/admin/instances` springen

Die eigentliche Roadmap-Ansicht findest du nun unter [http://localhost:3000/roadmap](http://localhost:3000/roadmap).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Multi-Instance Roadmap (Prisma-backed)

Multiple departments can now share one deployment while keeping isolated SharePoint credentials and UI settings. Configuration is stored in a local Prisma database.

1. **Install dependencies**
   ```bash
   yarn add @prisma/client prisma
   yarn prisma:generate
   ```
2. **Configure the database** – Set `DATABASE_URL` (SQLite by default) and `DEFAULT_ROADMAP_INSTANCE` in `.env`.
3. **Run the initial migration**
   ```bash
   yarn prisma:migrate
   yarn prisma:seed       # optional helper that copies current env values into Prisma
   ```
4. **Manage instances via API** – Use the protected admin endpoints:
   - `GET /api/instances` → list summaries
   - `POST /api/instances` → create new instance
   - `GET/PUT/DELETE /api/instances/[slug]` → inspect or update an instance  
     All routes require a valid admin JWT (`Authorization: Bearer <token>`).
5. **Instance resolution order** – For every API call the server tries:
   - explicit query param `?roadmapInstance=<slug>`
   - `X-Roadmap-Instance` header
   - `roadmap-instance` cookie
   - host mapping stored in Prisma (`RoadmapInstanceHost`)
   - fallback to `DEFAULT_ROADMAP_INSTANCE`

Use the cookie/header whenever the UI needs to pin a department (e.g., after a user selects it in a dropdown). SharePoint proxy routes automatically inject the correct service-account credentials and site URLs based on the resolved instance.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Troubleshooting 404 Chunk Files

If you see many `*.js` 404 errors for dynamic chunks after deployment (e.g. `cb355538-xxxx.js 404`):

1. Ensure only ONE Next.js config file exists. This repo currently has `next.config.mjs` (authoritative) and a legacy `next.config.ts`. Remove or rename the unused one (`next.config.ts`) to avoid conflicting `basePath` / `assetPrefix` / `trailingSlash` settings.
2. Confirm `basePath` and `assetPrefix` are aligned with the actual served subdirectory. In our config `assetPrefix` = `basePath` (no trailing slash) and `trailingSlash` disabled to prevent redirect rewriting of chunk URLs.
3. Clear server / proxy caches (some reverse proxies cache 404s for static assets) and hard refresh the browser (Ctrl+F5).
4. If hosted in SharePoint or behind a path-rewriting reverse proxy, verify that the subdirectory physically contains `/_next/static/*`. A missing rewrite rule for `/_next/` is a common cause.
5. Set `SUPPRESS_CONFIG_LOG=0` (default) and inspect build logs for the `[next.config]` line to verify the active basePath.

After adjustments, rebuild (`npm run build`) and redeploy.

## Kerberos (Negotiate) Authentication Mode

The application now supports a Kerberos mode (`SP_STRATEGY=kerberos`) that relies on the browser / OS integrated authentication (SPNEGO). In this mode the app does NOT construct NTLM handshakes or send explicit `Authorization` headers from server code; instead the SharePoint / IIS tier challenges with `WWW-Authenticate: Negotiate` and the browser supplies a Kerberos ticket automatically when the site is in the Local Intranet / trusted zone.

### Enable Kerberos in the App

Set environment variables (e.g. in `.env.local` for development):

```
SP_STRATEGY=kerberos
NEXT_PUBLIC_SP_AUTH_MODE=kerberos
```

All SharePoint proxy requests will expose a diagnostic header:

```
x-sp-auth-mode: kerberos
```

### SharePoint / IIS Prerequisites

1. Ensure Windows Authentication is enabled and ordered: `Negotiate` FIRST, `NTLM` SECOND (IIS Manager > Site > Authentication > Windows Authentication > Providers).
2. Register SPNs for the SharePoint web app service account (run as Domain Admin):
   ```
   setspn -S HTTP/your-sharepoint-host domain\\spserviceacct
   setspn -S HTTP/your-sharepoint-host.fqdn domain\\spserviceacct
   ```
   Verify:
   ```
   setspn -Q HTTP/your-sharepoint-host
   ```
3. Time sync: All servers and clients within < 5 min skew (Kerberos requirement).
4. If a reverse proxy / load balancer sits in front: configure Kerberos constrained delegation (KCD) from the proxy computer account to the HTTP SPN of SharePoint (Active Directory Users & Computers > Delegation tab).
5. Browsers: Add the SharePoint host and the Next.js host to Local Intranet (IE/Edge) or Auth whitelist policies (Chrome/Edge group policy `AuthServerWhitelist`).

### Application Behavior in Kerberos Mode

- `utils/spAuth.ts` returns only basic `Accept` header (no `Authorization`).
- The proxy route skips the cURL/NTLM fallback path.
- Browser requests to `/api/sharepoint/...` should trigger a 401 + `WWW-Authenticate: Negotiate` once, then succeed with a Kerberos ticket.
- Server-to-SharePoint direct calls that require delegation are limited unless the Node process itself has a valid TGT (running under a domain account with appropriate SPNs). For most scenarios let the browser perform the authenticated calls through the proxy.

### Validation Steps

1. Open DevTools Network for a SharePoint proxy request (e.g. `/api/sharepoint/_api/web?$select=Title`).
2. First response may be 401 with headers:
   - `WWW-Authenticate: Negotiate` (possibly also NTLM as fallback)
3. Second request should succeed (200) with request header:
   - `Authorization: Negotiate <base64>`
4. Response headers include `x-sp-auth-mode: kerberos`.
5. On the SharePoint server, check the Security event log for successful Kerberos service ticket (Event ID 4769) for `HTTP/your-sharepoint-host`.

### Troubleshooting

| Symptom                         | Check                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Still using NTLM                | Provider order (Negotiate must be first); SPN duplicates cause fallback.     |
| 401 loop                        | Missing SPN or browser not in Intranet zone. Use `setspn -Q HTTP/host`.      |
| KRB5KDC_ERR_S_PRINCIPAL_UNKNOWN | SPN not registered or typo in host FQDN.                                     |
| Works locally, fails via proxy  | Delegation/KCD not configured; verify delegation tab settings.               |
| Mixed content blocked           | Ensure all endpoints served over HTTPS so Kerberos handshake not downgraded. |

### Rollback

Set `SP_STRATEGY=onprem` (or previous value) and restart; NTLM logic & cURL fallback re-enable automatically.
