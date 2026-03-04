import { clientDataService } from './clientDataService';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from './instanceConfig';

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

    const results =
      typeof window !== 'undefined'
        ? await Promise.all(
            keys.map(async (k) => {
              const slug = getInstanceSlug();
              const query = slug ? `?${INSTANCE_QUERY_PARAM}=${encodeURIComponent(slug)}` : '';
              const resp = await fetch(`/api/settings/key/${encodeURIComponent(k)}${query}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
              });
              if (!resp.ok) return null;
              return await resp.json();
            })
          )
        : await Promise.all(keys.map((k) => clientDataService.getSettingByKey(k)));

    const settings: ThemeSettings = { ...DEFAULT_THEME };
    keys.forEach((k, i) => {
      const v = results[i]?.value;
      if (v && typeof v === 'string') settings[k] = v;
    });
    return settings;
  } catch {
    return DEFAULT_THEME;
  }
}
