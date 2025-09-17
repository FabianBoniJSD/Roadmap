export type AuthMode = 'online' | 'onprem' | 'fba' | 'kerberos' | string;

export function getAuthMode(): AuthMode {
  return process.env.SP_STRATEGY || process.env.NEXT_PUBLIC_SP_AUTH_MODE || 'online';
}

export function isKerberos(): boolean {
  return getAuthMode() === 'kerberos';
}

export function isOnPrem(): boolean {
  const m = getAuthMode();
  return /onprem/i.test(m) && m !== 'kerberos';
}
