import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';
import { loadUserCredentialsFromSecrets } from '@/utils/userCredentials';

/**
 * Admin check endpoint with GitHub Secrets integration.
 * 
 * Authorization logic:
 * 1. If USER_* GitHub Secrets exist → All users automatically have admin rights
 * 2. Otherwise fallback to SharePoint permission checks:
 *    - Site Collection Admin check (IsSiteAdmin)
 *    - Associated Owners Group membership
 *    - Heuristic fallback for "Owner"/"Besitzer" groups
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check if any USER_* secrets are configured
        const githubUsers = loadUserCredentialsFromSecrets();
        
        if (githubUsers.length > 0) {
            // If USER_* secrets exist, all of them automatically have admin rights
            console.log(`[check-admin] GitHub Secrets mode: ${githubUsers.length} user(s) with auto-admin rights`);
            return res.status(200).json({ 
                isAdmin: true,
                mode: 'github-secrets',
                users: githubUsers.map(u => u.username)
            });
        }
        
        // Fallback to traditional SharePoint permission check
        console.log('[check-admin] Using SharePoint permission check');
        const isAdmin = await clientDataService.isCurrentUserAdmin();
        
        return res.status(200).json({ 
            isAdmin,
            mode: 'sharepoint-permissions'
        });
        
    } catch (error) {
        console.error('[check-admin] Error:', error);
        return res.status(500).json({ 
            isAdmin: false, 
            error: 'Internal server error' 
        });
    }
}