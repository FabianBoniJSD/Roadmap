import type { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';

export interface AdminSessionPayload {
  username?: string;
  displayName?: string;
  isAdmin?: boolean;
  source?: string;
  groups?: unknown;
  [key: string]: unknown;
}

const ADMIN_TOKEN_COOKIE_KEY = 'roadmap-admin-token';

const parseCookieHeader = (cookieHeader: string | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
};

const readTokenFromCookie = (cookieHeader: string | undefined): string | null => {
  try {
    const parsed = parseCookieHeader(cookieHeader);
    const raw = parsed[ADMIN_TOKEN_COOKIE_KEY];
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
};

export function extractAdminSessionFromHeaders(headers: {
  authorization?: string | string[];
  cookie?: string;
}): AdminSessionPayload | null {
  const authHeader = Array.isArray(headers.authorization)
    ? headers.authorization[0]
    : headers.authorization;
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.substring(7) : null;
  const cookieToken = readTokenFromCookie(headers.cookie);
  const finalToken = token || cookieToken;
  if (!finalToken) return null;
  try {
    return jwt.verify(finalToken, JWT_SECRET) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function extractAdminSession(req: NextApiRequest): AdminSessionPayload | null {
  return extractAdminSessionFromHeaders({
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
  });
}

export function requireAdminSession(req: NextApiRequest): AdminSessionPayload {
  const payload = extractAdminSession(req);
  if (!payload || payload.isAdmin !== true) {
    throw new Error('Unauthorized');
  }
  return payload;
}
