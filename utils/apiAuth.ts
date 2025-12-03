import type { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';

export interface AdminSessionPayload {
  username?: string;
  displayName?: string;
  isAdmin?: boolean;
  source?: string;
  [key: string]: unknown;
}

export function extractAdminSession(req: NextApiRequest): AdminSessionPayload | null {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = header.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function requireAdminSession(req: NextApiRequest): AdminSessionPayload {
  const payload = extractAdminSession(req);
  if (!payload || payload.isAdmin !== true) {
    throw new Error('Unauthorized');
  }
  return payload;
}
