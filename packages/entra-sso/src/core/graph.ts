export type EntraUserProfile = {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
};

export type EntraGroupProfile = {
  id?: string;
  displayName?: string;
};

export async function fetchGraphMe(accessToken: string): Promise<EntraUserProfile> {
  const resp = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,userPrincipalName,mail',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const raw: unknown = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const errorVal = obj['error'];
    const errorObj =
      errorVal && typeof errorVal === 'object' ? (errorVal as Record<string, unknown>) : null;
    const messageVal = errorObj ? errorObj['message'] : null;
    const message = typeof messageVal === 'string' ? messageVal : 'Graph /me failed';
    throw new Error(message);
  }

  return raw as EntraUserProfile;
}

const ensureArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Best-effort group displayName fetch for the signed-in user.
 * Requires delegated Graph permissions (commonly: GroupMember.Read.All) with admin consent.
 * If permissions are missing, callers should catch and continue.
 */
export async function fetchGraphMyGroupDisplayNames(accessToken: string): Promise<string[]> {
  const names: string[] = [];
  let url: string | null =
    'https://graph.microsoft.com/v1.0/me/transitiveMemberOf/microsoft.graph.group?$select=displayName&$top=999';

  while (url) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const raw: unknown = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const errorVal = obj['error'];
      const errorObj =
        errorVal && typeof errorVal === 'object' ? (errorVal as Record<string, unknown>) : null;
      const messageVal = errorObj ? errorObj['message'] : null;
      const message = typeof messageVal === 'string' ? messageVal : 'Graph groups fetch failed';
      throw new Error(message);
    }

    const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    for (const entry of ensureArray(obj['value'])) {
      const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
      const dn = e && typeof e['displayName'] === 'string' ? e['displayName'] : '';
      if (dn && dn.trim()) names.push(dn.trim());
    }

    const next = obj['@odata.nextLink'];
    url = typeof next === 'string' && next ? next : null;
  }

  return Array.from(new Set(names));
}
