export interface RoadmapInstanceThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface RoadmapInstanceFeatureFlags {
  [feature: string]: boolean | string | number | null;
}

export type RoadmapInstanceHealthStatus = 'unknown' | 'ok' | 'insufficient' | 'error';

export interface RoadmapInstanceHealth {
  checkedAt?: string;
  compatibility?: {
    status: RoadmapInstanceHealthStatus;
    sharePointTeamServices?: string;
    webTitle?: string;
    webUrl?: string;
    webTemplate?: string;
    webTemplateConfiguration?: number;
    warnings?: string[];
    errors?: string[];
  };
  permissions: {
    status: RoadmapInstanceHealthStatus;
    message?: string;
    probeList?: string;
  };
  lists: {
    ensured: string[];
    created: string[];
    missing: string[];
    fieldsCreated: Record<string, string[]>;
    errors: Record<string, string>;
    schemaMismatches?: Record<
      string,
      {
        missing: string[];
        unexpected: string[];
        typeMismatches: { field: string; expected: string; actual: string }[];
      }
    >;
    schemaMismatchesIgnored?: Record<
      string,
      {
        missing: string[];
        unexpected: string[];
        typeMismatches: { field: string; expected: string; actual: string }[];
      }
    >;
  };
}

export interface RoadmapInstanceSharePointSettings {
  siteUrlDev: string;
  siteUrlProd: string;
  strategy: string;
  username?: string;
  password?: string;
  allowSelfSigned?: boolean;
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
  landingPage?: string | null;
  hosts: string[];
  sharePoint: RoadmapInstanceSharePointSettings;
  theme?: RoadmapInstanceThemeConfig;
  features?: RoadmapInstanceFeatureFlags;
  metadata?: Record<string, unknown>;
  settingsRaw?: Record<string, unknown>;
  health?: RoadmapInstanceHealth;
}

export interface RoadmapInstanceSummary extends Omit<RoadmapInstanceConfig, 'sharePoint'> {
  sharePoint: Omit<RoadmapInstanceSharePointSettings, 'username' | 'password'> & {
    usernameSet: boolean;
    passwordSet: boolean;
  };
}
