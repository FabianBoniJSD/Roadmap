import type { NextApiRequest, NextApiResponse } from 'next';
import { clientDataService } from '@/utils/clientDataService';

/**
 * Admin check endpoint following coding instructions pattern.
 * Uses centralized clientDataService.isCurrentUserAdmin() which implements:
 * 1. Site Collection Admin check (IsSiteAdmin)
 * 2. Associated Owners Group membership
 * 3. Heuristic fallback for "Owner"/"Besitzer" groups
 * 
 * Note: This checks via the established SharePoint proxy pattern.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Use centralized admin check as per coding instructions
        const isAdmin = await clientDataService.isCurrentUserAdmin();
        
        return res.status(200).json({ isAdmin });
        
    } catch (error) {
        console.error('[check-admin] Error:', error);
        return res.status(500).json({ 
            isAdmin: false, 
            error: 'Internal server error' 
        });
    }
}