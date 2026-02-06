export type EntraUserProfile = {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string;
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
