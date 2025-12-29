# Secrets & Environment Guide

This project uses environment variables for SharePoint auth, app config, and deployment. Keep real secrets out of git and prefer the provided tooling for encryption/rotation.

## Files & Git Hygiene
- Use `.env.example` as the authoritative variable list. Copy to `.env` (or `.env.local`) and fill locally; never commit real values.
- Encrypted or example files are safe to commit; plaintext secrets are not. Git ignores `.env*` by default.
- If you share configs, scrub passwords/tokens first.

## Core Variables
- `SP_STRATEGY`: `kerberos` | `onprem` (NTLM) | `fba` (forms).
- `INTERNAL_API_BASE_URL`: Absolute server URL for SSR fetches.
- `NEXT_PUBLIC_DEPLOYMENT_ENV`: `dev` | `production`.
- `NEXT_PUBLIC_BASE_PATH_DEV` / `NEXT_PUBLIC_BASE_PATH_PROD`: Reverse proxy base paths.
- SharePoint site/web URLs and credentials per auth mode (see `utils/authMode.ts`, `utils/sharepointEnv.ts`).
- JWT and PM2/Prisma related secrets as required by the stack.

## Local Development
1) Copy `.env.example` → `.env` (or `.env.local`).
2) Fill required vars; keep the file local only.
3) Run the app: `npm run dev`.

## Encryption & Rotation
- Use the secrets helper scripts in `scripts/encrypt-secrets.mjs`:
  - Generate key: `npm run secrets:generate-key` (store safely, not in git).
  - Encrypt: `npm run secrets:encrypt` → creates `.env.vault.json`.
  - Decrypt/verify: `npm run secrets:decrypt` / `npm run secrets:verify`.
- Store the master key in your deployment environment (e.g., CI secret), never in the repo.

## CI/CD & Deployment
- Provide secrets to the runner via environment/CI secrets (e.g., GitHub Actions vars), not checked-in files.
- After deploy on the self-hosted runner, restart with `npm run pm2:restart`.

## Safety Checklist
- Do not hardcode SharePoint URLs or credentials; use helpers like `resolveSharePointSiteUrl()`.
- Keep the OData/XML fallback and category normalization logic untouched when changing data layer code.
- Rotate credentials regularly; remove stale values from CI secrets.
- Confirm `.next`, logs, and other artifacts stay out of git.

## Troubleshooting
- Admin check failing: ensure the service account has Site Collection Admin or Owners group membership; verify `SP_STRATEGY` matches the deployment mode.
- NTLM/Kerberos issues: use `npm run ntlm:diag`, check browser SPNEGO config for Kerberos, or verify proxy settings.
- Missing env vars: compare against `.env.example` and the instructions in `.github/copilot-instructions.md`.
