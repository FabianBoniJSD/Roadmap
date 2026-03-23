const MODERN_STRATEGIES = new Set(['kerberos', 'fba', 'basic', 'delegated']);
const DELEGATED_ALIASES = new Set(['delegate', 'kcd', 'userdelegation']);
const LEGACY_KERBEROS_ALIASES = new Set(['onprem', 'ntlm', 'online']);

export function normalizeSharePointStrategy(raw: unknown, fallbackRaw?: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (MODERN_STRATEGIES.has(value)) return value;
  if (DELEGATED_ALIASES.has(value)) return 'delegated';

  const fallback = typeof fallbackRaw === 'string' ? fallbackRaw.trim().toLowerCase() : '';
  if (MODERN_STRATEGIES.has(fallback)) return fallback;
  if (DELEGATED_ALIASES.has(fallback)) return 'delegated';

  if (LEGACY_KERBEROS_ALIASES.has(value) || LEGACY_KERBEROS_ALIASES.has(fallback)) {
    return 'kerberos';
  }

  return 'kerberos';
}
