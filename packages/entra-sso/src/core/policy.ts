import type { EntraUserProfile } from './graph';

export function isUserAllowedByUpnAllowlist(args: {
  profile: EntraUserProfile;
  allowAll?: boolean;
  allowedUpnsCsv?: string;
}): boolean {
  if (args.allowAll) return true;

  const allowedUpnsRaw = String(args.allowedUpnsCsv || '').trim();
  if (!allowedUpnsRaw) return false;

  const candidates = [args.profile.userPrincipalName, args.profile.mail]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().toLowerCase());

  const allowed = allowedUpnsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((c) => allowed.includes(c));
}
