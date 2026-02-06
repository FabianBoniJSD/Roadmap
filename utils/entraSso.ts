import type { NextApiRequest } from 'next';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchGraphMe,
  generatePkcePair,
  generateRandomBase64Url,
  getEntraAuthority,
  isUserAllowedByUpnAllowlist,
  type EntraUserProfile,
} from '@roadmap/entra-sso/core';
import {
  buildSetCookie,
  getEntraRedirectUri as getRedirectUri,
  getRequestOrigin,
  parseCookies,
  resolveNextBasePathFromEnv,
  shouldUseSecureCookies,
  type EntraRedirectEnv,
} from '@roadmap/entra-sso/next';

export type { EntraUserProfile };
export {
  exchangeCodeForTokens,
  fetchGraphMe,
  generatePkcePair,
  generateRandomBase64Url,
  getEntraAuthority,
};
export { buildSetCookie, getRequestOrigin, parseCookies, shouldUseSecureCookies };

export function resolveNextBasePath(): string {
  return resolveNextBasePathFromEnv(process.env);
}

export function getEntraRedirectUri(req: NextApiRequest): string {
  return getRedirectUri({ req, env: process.env as EntraRedirectEnv });
}

export function entraSsoEnabled(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

export function buildEntraAuthorizeUrl(args: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  scopes: string[];
  prompt?: string;
}): string {
  return buildAuthorizeUrl(args);
}

export function isEntraUserAllowed(profile: EntraUserProfile): boolean {
  const allowAll = String(process.env.ENTRA_ALLOW_ALL || '').toLowerCase() === 'true';
  return isUserAllowedByUpnAllowlist({
    profile,
    allowAll,
    allowedUpnsCsv: process.env.ENTRA_ADMIN_UPNS,
  });
}
