# Local Admin Users via USER_* Secrets

Use USER_* environment variables to define local admin users for the admin panel. These do not replace the SharePoint service account (`SP_USERNAME`/`SP_PASSWORD`) used by the proxy.

## Format
- Variable name: `USER_<NAME>` (e.g., `USER_FABIAN`, `USER_ADMIN`).
- Value format: `<username>:<password-or-bcrypt-hash>`.
- Passwords may contain `:`; everything after the first colon is treated as the password segment.

## Where to set
- Local: add to `.env.local` (preferred) or `.env` (never commit real secrets).
- CI/runner: configure as environment/secret variables in your pipeline.

## Hashing behavior
- Bcrypt hashes are accepted directly (`$2b$...`).
- If a value is plaintext, the app auto-hashes it on startup using bcrypt (rounds from `USER_SECRET_HASH_ROUNDS`, default 12), updates `process.env`, and rewrites `.env.local`/`.env` with the hash. Replace plaintext with the logged hash to keep secrets out of files.
- If a hash was unquoted, it may be rewritten as `'username:<hash>'` for safety.

## Precedence
- SharePoint proxy credentials priority: overrides → `SP_USERNAME`/`SP_PASSWORD` → fallback to USER_* (only if a plaintext password is available). Do not rely on USER_* for the proxy in production; supply `SP_USERNAME`/`SP_PASSWORD` instead.
- Admin panel user list and checks read USER_* entries directly (hashed or plaintext both work).

## Examples
- Plaintext (will auto-hash): `USER_FABIAN=fabian:MySecret123!`
- Already hashed: `USER_ADMIN=admin:$2b$12$examplehashedvalue...`

## Maintenance
- Rotate credentials regularly and update secrets in CI/local files.
- Keep `.env*` out of git; commit only example or encrypted files.
- If auto-hash rewrites your env file, commit the file only after removing real secrets.

## Troubleshooting
- "Invalid format": ensure `username:password` shape is used.
- "No USER_* secrets found": set at least one USER_* or rely on `SP_USERNAME`/`SP_PASSWORD`.
- Proxy still using service account: expected; USER_* are for admin UI auth, not the primary SharePoint proxy.
