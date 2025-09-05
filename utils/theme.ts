import { clientDataService } from './clientDataService';

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
  gradientTo: '#b45309'
};

export async function loadThemeSettings(): Promise<ThemeSettings> {
  try {
    const keys = ['siteTitle','primaryColor','accentColor','gradientFrom','gradientTo'];
    const results = await Promise.all(keys.map(k => clientDataService.getSettingByKey(k)));
    const settings: any = { ...DEFAULT_THEME };
    keys.forEach((k, i) => {
      const v = results[i]?.value;
      if (v && typeof v === 'string') settings[k] = v;
    });
    return settings;
  } catch {
    return DEFAULT_THEME;
  }
}