import type { NextApiRequest } from 'next';

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function buildSetCookie(
  name: string,
  value: string,
  opts: {
    maxAgeSeconds?: number;
    httpOnly?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
    path?: string;
  } = {}
): string {
  const segments: string[] = [];
  segments.push(`${name}=${encodeURIComponent(value)}`);
  segments.push(`Path=${opts.path || '/'}`);
  if (typeof opts.maxAgeSeconds === 'number') segments.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.httpOnly) segments.push('HttpOnly');
  if (opts.secure) segments.push('Secure');
  segments.push(`SameSite=${opts.sameSite || 'Lax'}`);
  return segments.join('; ');
}

export function shouldUseSecureCookies(req: NextApiRequest): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (proto === 'https') return true;
  return process.env.NODE_ENV === 'production';
}
