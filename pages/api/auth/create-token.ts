import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'roadmap-secret-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Create a JWT token based on user data authenticated via SharePoint
 * The browser has already verified the user with SharePoint directly
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, displayName, isSiteAdmin, groups } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Verify that user has admin rights
    const adminGroupRegex = /\b(owner|besitzer|roadmapadmin|roadadmin)\b/i;
    const isInAdminGroup = Array.isArray(groups) && groups.some(
      (group: string) => adminGroupRegex.test(group)
    );

    if (!isSiteAdmin && !isInAdminGroup) {
      return res.status(403).json({ 
        error: 'Sie sind nicht Mitglied der Roadmapadmin-Gruppe' 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        username, 
        displayName, 
        isSiteAdmin: isSiteAdmin || false,
        isAdmin: true,
        groups: groups || []
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`[create-token] Created token for user: ${username} (${displayName})`);

    return res.status(200).json({ 
      token,
      username: displayName || username
    });

  } catch (error: any) {
    console.error('[create-token] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Interner Serverfehler' 
    });
  }
}
