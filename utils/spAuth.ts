import https from 'https';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Buffer } from 'buffer';

import { fbaLogin } from './fbaAuth';
import { resolveSharePointSiteUrl } from './sharepointEnv';
import { getPrimaryCredentials } from './userCredentials';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

export interface SharePointAuthContext {
  headers: Record<string, string>;
  agent?: https.Agent;
}

type CacheEntry = SharePointAuthContext & { expires: number };
const cache = new Map<string, CacheEntry>();

function debugLog(...args: unknown[]) {
  if (process.env.SP_PROXY_DEBUG === 'true') {
    // eslint-disable-next-line no-console
    console.debug('[spAuth]', ...args);
  }
}

const buildCacheKey = (params: { siteUrl: string; strategy: string; username?: string }) => {
  // No passwords in cache keys.
  return crypto
    .createHash('sha256')
    .update([params.siteUrl, params.strategy, params.username || ''].join('::'))
    .digest('hex');
};

const getTrustedCaPath = (instance?: RoadmapInstanceConfig | null): string | undefined => {
  const candidate = instance?.sharePoint.trustedCaPath || process.env.SP_TRUSTED_CA_PATH;
  if (!candidate) return undefined;
  return candidate.trim() || undefined;
};

const applyTlsSettings = (instance?: RoadmapInstanceConfig | null) => {
  const allowSelfSigned =
    instance?.sharePoint.allowSelfSigned === true ||
    process.env.SP_ALLOW_SELF_SIGNED === 'true' ||
    process.env.SP_TLS_FALLBACK_INSECURE === 'true';

  if (allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    return;
  }

  const trustedCa = getTrustedCaPath(instance);
  if (!trustedCa) {
    delete process.env.NODE_EXTRA_CA_CERTS;
    return;
  }

  const baseDir = typeof process.cwd === 'function' ? process.cwd() : '.';
  const caPath = path.isAbsolute(trustedCa) ? trustedCa : path.join(baseDir, trustedCa);
  if (fs.existsSync(caPath)) {
    process.env.NODE_EXTRA_CA_CERTS = caPath;
  }
};

export async function getSharePointAuthHeaders(
  instance?: RoadmapInstanceConfig | null
): Promise<SharePointAuthContext> {
  const inst = instance || null;
  applyTlsSettings(inst);

  const siteUrl = resolveSharePointSiteUrl(inst || undefined);
  const strategyRaw = inst?.sharePoint.strategy || process.env.SP_STRATEGY || 'kerberos';
  const strategy = String(strategyRaw).trim().toLowerCase();

  if (strategy === 'kerberos') {
    if (process.env.SP_USE_CURL !== 'true') {
      throw new Error(
        'SP_STRATEGY=kerberos requires SP_USE_CURL=true (Kerberos/SPNEGO is only supported via curl in the proxy).'
      );
    }
    return { headers: { Accept: 'application/json;odata=nometadata' } };
  }

  const credentials = getPrimaryCredentials({
    username: inst?.sharePoint.username,
    password: inst?.sharePoint.password,
  });
  if (!credentials) {
    throw new Error(
      'No credentials found. Set SP_USERNAME/SP_PASSWORD (preferred) or USER_* secrets.'
    );
  }

  const username = credentials.username;
  const password = credentials.password;
  const cacheKey = buildCacheKey({ siteUrl, strategy, username });
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached;
  if (cached) cache.delete(cacheKey);

  if (strategy === 'fba') {
    debugLog('fba auth start', { siteUrl, user: username });
    const fba = await fbaLogin(
      siteUrl,
      username.includes('\\') ? username.split('\\')[1] : username,
      password
    );
    const entry: CacheEntry = {
      headers: { Cookie: fba.cookie, Accept: 'application/json;odata=verbose' },
      expires: fba.expires,
    };
    cache.set(cacheKey, entry);
    return entry;
  }

  if (strategy === 'basic') {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const entry: CacheEntry = {
      headers: {
        Accept: 'application/json;odata=nometadata',
        Authorization: `Basic ${auth}`,
      },
      expires: Date.now() + 60 * 60 * 1000,
    };
    cache.set(cacheKey, entry);
    return entry;
  }

  throw new Error(`Unsupported SharePoint auth strategy: ${strategy}.`);
}
