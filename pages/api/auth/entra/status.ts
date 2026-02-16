import type { NextApiRequest, NextApiResponse } from 'next';
import { getEntraRedirectUri, type EntraRedirectEnv } from '@roadmap/entra-sso/next';

function entraSsoEnabled(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const override = String(process.env.ENTRA_REDIRECT_URI || '').trim();
  const overrideValid = override ? override.includes('/api/auth/entra/callback') : null;

  return res.status(200).json({
    enabled: entraSsoEnabled(),
    tenantIdConfigured: Boolean(process.env.ENTRA_TENANT_ID),
    clientIdConfigured: Boolean(process.env.ENTRA_CLIENT_ID),
    redirectUriConfigured: Boolean(
      process.env.ENTRA_REDIRECT_URI && process.env.ENTRA_REDIRECT_URI.trim()
    ),
    redirectUriOverride: override || null,
    redirectUriOverrideValid: overrideValid,
    computedRedirectUri: getEntraRedirectUri({ req, env: process.env as EntraRedirectEnv }),
    allowlistConfigured: Boolean(
      (process.env.ENTRA_ADMIN_UPNS && process.env.ENTRA_ADMIN_UPNS.trim()) ||
      String(process.env.ENTRA_ALLOW_ALL || '').toLowerCase() === 'true'
    ),
  });
}
