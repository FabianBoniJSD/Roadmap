import { clientDataService } from './clientDataService';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from './instanceConfig';
import { prefixBasePath } from './nextBasePath';

export interface ThemeSettings {
  siteTitle: string;
  primaryColor: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const DEFAULT_THEME: ThemeSettings = {
  siteTitle: 'IT + Digital Roadmap',
  primaryColor: '#eab308',
  accentColor: '#3B82F6',
  gradientFrom: '#eab308',
  gradientTo: '#b45309',
};

export async function loadThemeSettings(): Promise<ThemeSettings> {
  try {
    const keys = [
      'siteTitle',
      'primaryColor',
      'accentColor',
      'gradientFrom',
      'gradientTo',
    ] as const;
    type ThemeKey = (typeof keys)[number];

    const isThemeKey = (value: string): value is ThemeKey => {
      return keys.includes(value as ThemeKey);
    };

    const getInstanceSlug = (): string | null => {
      if (typeof window === 'undefined') return null;
      try {
        const fromQuery = new URLSearchParams(window.location.search).get(INSTANCE_QUERY_PARAM);
        if (fromQuery) return fromQuery;
      } catch {
        // ignore
      }
      try {
        const cookies = document.cookie
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean);
        const key = `${INSTANCE_COOKIE_NAME}=`.toLowerCase();
        const match = cookies.find((c) => c.toLowerCase().startsWith(key));
        if (match) return decodeURIComponent(match.substring(INSTANCE_COOKIE_NAME.length + 1));
      } catch {
        // ignore
      }
      return null;
    };

    const valueByKey: Partial<Record<ThemeKey, string>> = {};

    if (typeof window !== 'undefined') {
      const slug = getInstanceSlug();
      const query = slug ? `?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(slug)}` : '';
      const resp = await fetch(`${prefixBasePath('/api/settings')}${query}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (resp.ok) {
        const payload = await resp.json().catch(() => null);
        const list = Array.isArray(payload) ? payload : [];
        for (const entry of list) {
          const key = typeof entry?.key === 'string' ? entry.key : '';
          const value = typeof entry?.value === 'string' ? entry.value : '';
          if (isThemeKey(key) && value) {
            valueByKey[key] = value;
          }
        }
      }
    } else {
      const results = await Promise.all(keys.map((k) => clientDataService.getSettingByKey(k)));
      keys.forEach((k, i) => {
        const value = results[i]?.value;
        if (value && typeof value === 'string') valueByKey[k] = value;
      });
    }

    const settings: ThemeSettings = { ...DEFAULT_THEME };
    keys.forEach((k) => {
      const v = valueByKey[k];
      if (v && typeof v === 'string') settings[k] = v;
    });
    return settings;
  } catch {
    return DEFAULT_THEME;
  }
}
