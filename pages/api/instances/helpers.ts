import type { NextApiRequest } from 'next';

export const sanitizeSlug = (value: string) => value.trim().toLowerCase();

export const coerceBool = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
};

export const normalizeHosts = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((host) => (typeof host === 'string' ? host.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  );
};

export const buildSettingsPayload = (body: NextApiRequest['body']) => {
  const settings: Record<string, unknown> = {};
  if (body?.theme && typeof body.theme === 'object') settings.theme = body.theme;
  if (body?.features && typeof body.features === 'object') settings.features = body.features;
  if (body?.metadata && typeof body.metadata === 'object') settings.metadata = body.metadata;
  return Object.keys(settings).length > 0 ? settings : undefined;
};

export const serializeSettings = (value?: Record<string, unknown>) => {
  if (!value) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};
