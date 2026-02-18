import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';

/**
 * Check if the current session has a valid JWT token
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ isAdmin: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        isAdmin?: boolean;
        displayName?: string;
        username?: string;
        groups?: unknown;
      };

      const groups = Array.isArray(decoded.groups)
        ? decoded.groups.filter((g): g is string => typeof g === 'string')
        : [];
      const isSuperAdmin = groups.map((g) => g.trim().toLowerCase()).includes('superadmin');

      return res.status(200).json({
        isAdmin: decoded.isAdmin || false,
        username: decoded.displayName || decoded.username,
        groups,
        isSuperAdmin,
      });
    } catch (jwtError) {
      const errorMessage = jwtError instanceof Error ? jwtError.message : 'Unknown error';
      console.error('[check-admin-session] JWT verification failed:', errorMessage);
      return res.status(401).json({
        isAdmin: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[check-admin-session] Error:', error);
    return res.status(500).json({
      isAdmin: false,
      error: errorMessage,
    });
  }
}
