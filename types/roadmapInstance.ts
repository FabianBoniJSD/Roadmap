export interface RoadmapInstanceThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface RoadmapInstanceFeatureFlags {
  [feature: string]: boolean | string | number | null;
}

export interface RoadmapInstanceSharePointSettings {
  siteUrlDev: string;
  siteUrlProd: string;
  strategy: string;
  username?: string;
  password?: string;
  domain?: string | null;
  workstation?: string | null;
  allowSelfSigned?: boolean;
  needsProxy?: boolean;
  extraModes: string[];
  forceSingleCreds?: boolean;
  authNoCache?: boolean;
  manualNtlmFallback?: boolean;
  ntlmPersistentSocket?: boolean;
  ntlmSocketProbe?: boolean;
  trustedCaPath?: string | null;
}

export interface RoadmapInstanceSettingsPayload {
  theme?: RoadmapInstanceThemeConfig | null;
  features?: RoadmapInstanceFeatureFlags | null;
  metadata?: Record<string, unknown> | null;
}

export interface RoadmapInstanceConfig {
  id: number;
  slug: string;
  displayName: string;
  department?: string | null;
  description?: string | null;
  deploymentEnv?: string | null;
  defaultLocale?: string | null;
  defaultTimeZone?: string | null;
  hosts: string[];
  sharePoint: RoadmapInstanceSharePointSettings;
  theme?: RoadmapInstanceThemeConfig;
  features?: RoadmapInstanceFeatureFlags;
  metadata?: Record<string, unknown>;
  settingsRaw?: Record<string, unknown>;
}

export interface RoadmapInstanceSummary extends Omit<RoadmapInstanceConfig, 'sharePoint'> {
  sharePoint: Omit<RoadmapInstanceSharePointSettings, 'username' | 'password'> & {
    usernameSet: boolean;
    passwordSet: boolean;
  };
}
