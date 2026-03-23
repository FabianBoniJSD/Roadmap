import { normalizeSharePointStrategy } from './sharePointStrategy';

export type AuthMode = 'kerberos' | 'fba' | 'basic' | string;

export function getAuthMode(): AuthMode {
  return normalizeSharePointStrategy(
    process.env.SP_STRATEGY || process.env.NEXT_PUBLIC_SP_AUTH_MODE || 'kerberos'
  );
}

export function isKerberos(): boolean {
  return getAuthMode() === 'kerberos';
}
