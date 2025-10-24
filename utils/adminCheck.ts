import { resolveSharePointSiteUrl } from './sharepointEnv';

/**
 * Client-side admin check using browser's NTLM/Kerberos authentication.
 * This checks the ACTUAL logged-in user (browser credentials), not the service account.
 * 
 * Follows the same three-tier pattern as clientDataService.isCurrentUserAdmin():
 * 1. Site Collection Admin (IsSiteAdmin)
 * 2. Associated Owners Group membership
 * 3. Heuristic check for "Owner"/"Besitzer" in group titles
 * 
 * This function must run in the browser context where NTLM/Kerberos
 * authentication is automatically handled by the browser.
 */
export async function checkCurrentUserIsAdmin(): Promise<boolean> {
    try {
        const spSiteUrl = resolveSharePointSiteUrl();
        console.log('[adminCheck] Using SharePoint site URL:', spSiteUrl);
        
        // Security: Only allow admin access when running in SharePoint App Part (same-origin)
        // This ensures real user Windows Authentication, not service account
        if (typeof window !== 'undefined') {
            const browserOrigin = window.location.origin;
            const spOrigin = new URL(spSiteUrl).origin;
            const isSameOrigin = browserOrigin === spOrigin;
            
            console.log('[adminCheck] Browser origin:', browserOrigin);
            console.log('[adminCheck] SharePoint origin:', spOrigin);
            console.log('[adminCheck] Same-origin:', isSameOrigin);
            
            if (!isSameOrigin) {
                console.warn('[adminCheck] ❌ Cross-origin detected! Admin access only allowed from SharePoint App Part.');
                console.warn('[adminCheck] ❌ Cross-origin requests use service account, not real user credentials.');
                console.warn('[adminCheck] ❌ Please access admin features through the SharePoint App Part at:', spOrigin);
                return false; // Block admin access on external domains
            }
            
            console.log('[adminCheck] ✓ Same-origin verified - using real user Windows Authentication');
        }
        
        // 1. Check Site Collection Admin status
        const userEndpoint = `${spSiteUrl}/_api/web/currentuser`;
        console.log('[adminCheck] Fetching user from:', userEndpoint);
        
        const userResponse = await fetch(userEndpoint, {
            credentials: 'include', // Browser sends NTLM/Kerberos automatically
            headers: {
                'Accept': 'application/json;odata=nometadata',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('[adminCheck] User response status:', userResponse.status, userResponse.statusText);
        
        if (!userResponse.ok) {
            console.warn('[adminCheck] Failed to get current user:', userResponse.status);
            return false;
        }
        
        const userData = await userResponse.json();
        const userId = userData.Id ?? userData?.d?.Id;
        
        console.log('[adminCheck] Current user full data:', userData);
        console.log('[adminCheck] Current user:', {
            id: userId,
            loginName: userData.LoginName ?? userData?.d?.LoginName,
            title: userData.Title ?? userData?.d?.Title,
            isSiteAdmin: userData.IsSiteAdmin ?? userData?.d?.IsSiteAdmin
        });
        
        // Site Collection Admin check - highest priority
        if (userData.IsSiteAdmin === true || userData?.d?.IsSiteAdmin === true) {
            console.log('[adminCheck] ✓ User is Site Collection Admin');
            return true;
        }
        
        // 2. Check Associated Owners Group membership
        const ownerGroupEndpoint = `${spSiteUrl}/_api/web/AssociatedOwnerGroup?$select=Id,Title`;
        console.log('[adminCheck] Fetching owner group from:', ownerGroupEndpoint);
        
        const ownerGroupResp = await fetch(ownerGroupEndpoint, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json;odata=nometadata',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('[adminCheck] Owner group response status:', ownerGroupResp.status);
        
        if (!ownerGroupResp.ok) {
            console.warn('[adminCheck] Failed to get AssociatedOwnerGroup, trying heuristic fallback');
            
            // 3. Fallback: Heuristic check for "Owner" or "Besitzer" in group titles
            const groupsEndpoint = `${spSiteUrl}/_api/web/currentuser/Groups?$select=Id,Title`;
            console.log('[adminCheck] Fetching user groups (heuristic) from:', groupsEndpoint);
            
            const groupsResp = await fetch(groupsEndpoint, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log('[adminCheck] User groups response status:', groupsResp.status);
            
            if (groupsResp.ok) {
                const groupsData = await groupsResp.json();
                const groups: Array<{ Id?: number; Title?: string }> = 
                    groupsData?.value || groupsData?.d?.results || [];
                
                console.log('[adminCheck] User groups found:', groups.length);
                console.log('[adminCheck] User groups details:', groups.map(g => ({ id: g.Id, title: g.Title })));
                
                // Check for "owner", "besitzer", or "roadadmin" in group titles
                const hasOwnerGroup = groups.some(g => {
                    const title = (g.Title || '').toLowerCase();
                    const matches = /\b(owner|besitzer|roadadmin)\b/i.test(title);
                    if (matches) {
                        console.log('[adminCheck] ✓ Found matching group:', g.Title);
                    }
                    return matches;
                });
                
                if (hasOwnerGroup) {
                    console.log('[adminCheck] ✓ User in owner/admin group (heuristic match)');
                    return true;
                }
            }
            
            console.log('[adminCheck] ✗ User is not an admin (heuristic check failed)');
            return false;
        }
        
        const ownerGroup = await ownerGroupResp.json();
        const ownerId: number | undefined = ownerGroup?.Id ?? ownerGroup?.d?.Id;
        const ownerTitle: string | undefined = ownerGroup?.Title ?? ownerGroup?.d?.Title;
        
        console.log('[adminCheck] AssociatedOwnerGroup:', { id: ownerId, title: ownerTitle });
        
        if (!ownerId && !ownerTitle) {
            console.log('[adminCheck] ✗ No owner group found');
            return false;
        }
        
        // Check if user is member of the owners group
        const userGroupsEndpoint = `${spSiteUrl}/_api/web/currentuser/Groups?$select=Id,Title`;
        console.log('[adminCheck] Fetching user groups for membership check from:', userGroupsEndpoint);
        
        const userGroupsResp = await fetch(userGroupsEndpoint, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json;odata=nometadata',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('[adminCheck] User groups response status:', userGroupsResp.status);
        
        if (!userGroupsResp.ok) {
            console.warn('[adminCheck] Failed to get user groups');
            return false;
        }
        
        const userGroupsData = await userGroupsResp.json();
        const userGroups: Array<{ Id?: number; Title?: string }> = 
            userGroupsData?.value || userGroupsData?.d?.results || [];
        
        console.log('[adminCheck] User groups found:', userGroups.length);
        console.log('[adminCheck] User groups details:', userGroups.map(g => `${g.Title} (ID: ${g.Id})`));
        
        // Check for owner group membership
        const isOwner = userGroups.some(g => {
            const matchById = ownerId && g.Id === ownerId;
            const matchByTitle = ownerTitle && String(g.Title) === String(ownerTitle);
            if (matchById || matchByTitle) {
                console.log('[adminCheck] ✓ Matched owner group:', g.Title, 'by', matchById ? 'ID' : 'Title');
            }
            return matchById || matchByTitle;
        });
        
        if (isOwner) {
            console.log('[adminCheck] ✓ User is member of AssociatedOwnerGroup');
            return true;
        }
        
        // Additional heuristic check: look for "owner", "besitzer", or "roadadmin" in group titles
        console.log('[adminCheck] Owner group check failed, trying heuristic on group titles');
        const hasAdminGroup = userGroups.some(g => {
            const title = (g.Title || '').toLowerCase();
            const matches = /\b(owner|besitzer|roadadmin)\b/i.test(title);
            if (matches) {
                console.log('[adminCheck] ✓ Found admin group by heuristic:', g.Title);
            }
            return matches;
        });
        
        if (hasAdminGroup) {
            console.log('[adminCheck] ✓ User is admin (heuristic match)');
            return true;
        }
        
        console.log('[adminCheck] ✗ User is not an admin');
        return false;
        
    } catch (error) {
        console.error('[adminCheck] Error checking admin status:', error);
        return false;
    }
}

/**
 * Get current user information from SharePoint.
 * Uses browser's automatic NTLM/Kerberos authentication.
 */
export async function getCurrentUser(): Promise<{
    id: number;
    loginName: string;
    title: string;
    email: string;
    isSiteAdmin: boolean;
} | null> {
    try {
        const spSiteUrl = resolveSharePointSiteUrl();
        const userEndpoint = `${spSiteUrl}/_api/web/currentuser`;
        
        const response = await fetch(userEndpoint, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json;odata=nometadata',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.warn('[getCurrentUser] Failed to get current user:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        return {
            id: data.Id ?? data?.d?.Id,
            loginName: data.LoginName ?? data?.d?.LoginName ?? '',
            title: data.Title ?? data?.d?.Title ?? '',
            email: data.Email ?? data?.d?.Email ?? '',
            isSiteAdmin: data.IsSiteAdmin ?? data?.d?.IsSiteAdmin ?? false
        };
    } catch (error) {
        console.error('[getCurrentUser] Error:', error);
        return null;
    }
}
