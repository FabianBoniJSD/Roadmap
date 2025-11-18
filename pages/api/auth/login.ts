import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

interface LoginRequest {
  username: string;
  password: string;
  domain?: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  isAdmin?: boolean;
  user?: {
    id: number;
    loginName: string;
    title: string;
    email: string;
  };
  error?: string;
}

/**
 * Login endpoint for domain users
 * Authenticates against SharePoint with user credentials and checks admin status
 * 
 * Follows coding instructions:
 * - Uses SharePoint REST API directly with user credentials
 * - Validates method, wraps in try/catch
 * - Returns pure JSON, no internal errors leaked
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password, domain = 'bs' }: LoginRequest = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    // Normalize username format
    let normalizedUsername = username;
    
    // Convert email format to domain\user format
    if (username.includes('@')) {
      const localPart = username.split('@')[0];
      normalizedUsername = `${domain}\\${localPart}`;
    }
    // Add domain prefix if missing
    else if (!username.includes('\\')) {
      normalizedUsername = `${domain}\\${username}`;
    }

    console.log('[login] Attempting authentication for:', normalizedUsername.replace(/\\/g, '\\\\'));

    // Authenticate user with SharePoint using provided credentials
    const authenticatedUser = await authenticateWithSharePoint(normalizedUsername, password);

    if (!authenticatedUser) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    console.log('[login] User authenticated:', authenticatedUser.loginName);

    // Check if user is admin
    const isAdmin = await checkUserIsAdmin(normalizedUsername, password);

    console.log('[login] Admin check result:', isAdmin);

    // Generate simple auth token (in production, use proper JWT)
    const token = Buffer.from(`${normalizedUsername}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      success: true,
      token,
      isAdmin,
      user: authenticatedUser
    });

  } catch (error) {
    console.error('[login] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed. Please check your credentials.' 
    });
  }
}

/**
 * Authenticate user against SharePoint with their domain credentials
 * Uses SharePoint REST API _api/web/currentuser
 */
async function authenticateWithSharePoint(
  username: string, 
  password: string
): Promise<{ id: number; loginName: string; title: string; email: string } | null> {
  try {
    // Create authorization header with user credentials
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const spSiteUrl = process.env.SP_SITE_URL || 'https://spi.intranet.bs.ch/JSD/Digital';
    const userEndpoint = `${spSiteUrl}/_api/web/currentuser`;

    // Disable SSL verification if configured (matches NODE_TLS_REJECT_UNAUTHORIZED pattern)
    const httpsAgent = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' 
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    const response = await fetch(userEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'Authorization': `Basic ${auth}`
      },
      // @ts-ignore - agent property exists in Node.js fetch
      agent: httpsAgent
    });

    if (!response.ok) {
      console.error('[authenticateWithSharePoint] Failed:', response.status, response.statusText);
      return null;
    }

    const userData = await response.json();
    
    return {
      id: userData.Id,
      loginName: userData.LoginName,
      title: userData.Title,
      email: userData.Email || ''
    };
  } catch (error) {
    console.error('[authenticateWithSharePoint] Error:', error);
    return null;
  }
}

/**
 * Check if user has admin privileges using their credentials
 * Follows the same three-tier check as clientDataService.isCurrentUserAdmin():
 * 1. Site Collection Admin (IsSiteAdmin)
 * 2. Associated Owners Group membership
 * 3. Heuristic check for "roadadmin" in group titles
 */
async function checkUserIsAdmin(username: string, password: string): Promise<boolean> {
  try {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const spSiteUrl = process.env.SP_SITE_URL || 'https://spi.intranet.bs.ch/JSD/Digital';

    const httpsAgent = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' 
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    // 1. Check Site Collection Admin status
    const userResponse = await fetch(`${spSiteUrl}/_api/web/currentuser`, {
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'Authorization': `Basic ${auth}`
      },
      // @ts-ignore
      agent: httpsAgent
    });

    if (!userResponse.ok) return false;

    const userData = await userResponse.json();
    
    if (userData.IsSiteAdmin === true) {
      console.log('[checkUserIsAdmin] User is Site Collection Admin');
      return true;
    }

    // 2. Check Associated Owners Group membership
    const ownerGroupResp = await fetch(`${spSiteUrl}/_api/web/AssociatedOwnerGroup?$select=Id,Title`, {
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'Authorization': `Basic ${auth}`
      },
      // @ts-ignore
      agent: httpsAgent
    });

    if (ownerGroupResp.ok) {
      const ownerGroup = await ownerGroupResp.json();
      const ownerGroupId = ownerGroup.Id || ownerGroup.d?.Id;

      // Get user's groups
      const groupsResp = await fetch(`${spSiteUrl}/_api/web/currentuser/Groups?$select=Id,Title`, {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Authorization': `Basic ${auth}`
        },
        // @ts-ignore
        agent: httpsAgent
      });

      if (groupsResp.ok) {
        const groupsData = await groupsResp.json();
        const userGroups = groupsData.value || groupsData.d?.results || [];

        // Check if user is in owner group
        const isInOwnerGroup = userGroups.some((g: any) => g.Id === ownerGroupId);
        if (isInOwnerGroup) {
          console.log('[checkUserIsAdmin] User is in Associated Owners Group');
          return true;
        }

        // 3. Heuristic check for admin groups (including roadadmin)
        const hasAdminGroup = userGroups.some((g: any) => {
          const title = (g.Title || '').toLowerCase();
          return /\b(owner|besitzer|roadadmin)\b/i.test(title);
        });

        if (hasAdminGroup) {
          console.log('[checkUserIsAdmin] User is in admin group (heuristic match)');
          return true;
        }
      }
    }

    console.log('[checkUserIsAdmin] User is not an admin');
    return false;
  } catch (error) {
    console.error('[checkUserIsAdmin] Error:', error);
    return false;
  }
}
