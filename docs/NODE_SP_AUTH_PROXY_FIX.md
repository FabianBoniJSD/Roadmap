# node-sp-auth Proxy Compatibility Fix

## Problem

When using `node-sp-auth` v3.x with `HTTP_PROXY`/`HTTPS_PROXY` environment variables set, authentication fails with error:

```
TypeError: Expected the 'options.agent' properties to be 'http', 'https' or 'http2', got '_events'
```

## Root Cause

- `node-sp-auth` v3.x uses `got` v9.x library internally for HTTP requests
- `got` automatically detects `HTTP_PROXY`/`HTTPS_PROXY` environment variables
- When proxy is configured, `got` creates its own proxy agent
- However, `node-sp-auth` doesn't expose a way to customize agent configuration
- The `got` library expects agents in format `{ http: agent, https: agent }`
- Internal agent creation in `got` fails due to format mismatch

## Solution

**Temporary workaround** in `utils/spAuth.ts`:

1. Save proxy environment variables before calling `node-sp-auth`
2. Delete proxy env vars temporarily
3. Call `node-sp-auth.getAuth()` (will use direct connection)
4. Restore proxy env vars after call completes

This allows `node-sp-auth` to make direct connections to SharePoint while other parts of the application can still use the proxy.

## Configuration

### Default Behavior (Recommended)

Proxy is automatically disabled for `node-sp-auth` calls:

```env
# No configuration needed - proxy disabled by default for node-sp-auth
HTTP_PROXY=http://127.0.0.1:3128
HTTPS_PROXY=http://127.0.0.1:3128
```

### If SharePoint Requires Proxy

If your SharePoint server is **only accessible through a proxy**, set:

```env
SP_NODE_SP_AUTH_NEEDS_PROXY=true
```

⚠️ **Warning**: This will keep the proxy enabled but may cause the original agent error.

## Alternative Solutions

If direct connection doesn't work, consider:

### 1. Upgrade node-sp-auth

Check if newer versions (v4.x+) have fixed the agent issue:

```bash
npm install node-sp-auth@latest
```

### 2. Replace node-sp-auth

Switch to direct NTLM/Basic auth implementation that supports custom agents:

```typescript
// Example with node-fetch and custom agent
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent('http://127.0.0.1:3128');
const auth = Buffer.from(`${username}:${password}`).toString('base64');

const response = await fetch(sharePointUrl, {
  headers: { 'Authorization': `Basic ${auth}` },
  agent
});
```

### 3. Use curl fallback

Enable curl-based authentication (already implemented):

```env
SP_USE_CURL=true
```

## Files Changed

- `utils/spAuth.ts` - Added proxy workaround for `node-sp-auth` calls
- `utils/httpsAgent.ts` - Reverted agent format changes (not used by node-sp-auth)
- `.env.example` - Documented new `SP_NODE_SP_AUTH_NEEDS_PROXY` variable

## Testing

1. Verify authentication works:
   ```bash
   # Check PM2 logs for successful auth
   pm2 logs roadmap-app --lines 50 | Select-String "Credentials"
   ```

2. Expected log output:
   ```
   [Credentials] Loaded 1 user credential(s) from GitHub Secrets
   [Credentials] Using USER_FABIAN: fabian.boni
   [spAuth] node-sp-auth proxy workaround: temporarily disabled HTTP(S)_PROXY env vars
   [spAuth] auth success
   ```

3. Test SharePoint API calls:
   ```bash
   # Test from browser
   http://localhost:3000/api/projects
   ```

## Related Issues

- node-sp-auth v3.x agent compatibility with got library
- HTTP_PROXY/HTTPS_PROXY environment variable handling
- HttpsProxyAgent format expectations

## References

- node-sp-auth: https://github.com/s-KaiNet/node-sp-auth
- got library: https://github.com/sindresorhus/got
- https-proxy-agent: https://github.com/TooTallNate/proxy-agents
