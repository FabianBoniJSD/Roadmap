import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const normalize = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

export type InstanceAdminAccessConfig = {
  allowedUsers?: string[];
  allowedGroups?: string[];
};

type MutableSettingsRecord = Record<string, unknown>;

export const getInstanceAdminAccessConfig = (
  metadata?: Record<string, unknown>
): InstanceAdminAccessConfig | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).adminAccess;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const cfg = raw as Record<string, unknown>;

  const allowedUsersRaw = cfg.allowedUsers;
  const allowedUsers = Array.isArray(allowedUsersRaw)
    ? allowedUsersRaw.map((u) => normalize(u)).filter(Boolean)
    : [];

  const allowedGroupsRaw = cfg.allowedGroups;
  const allowedGroups = Array.isArray(allowedGroupsRaw)
    ? allowedGroupsRaw.map((g) => normalize(g)).filter(Boolean)
    : [];

  return {
    allowedUsers: allowedUsers.length ? Array.from(new Set(allowedUsers)) : [],
    allowedGroups: allowedGroups.length ? Array.from(new Set(allowedGroups)) : [],
  };
};

type AdminPrincipal = {
  username: string | null | undefined;
  groups?: unknown;
};

const normalizeGroups = (groups: unknown): string[] => {
  if (!Array.isArray(groups)) return [];
  return Array.from(
    new Set(
      groups
        .map((g) => (typeof g === 'string' ? g : g != null ? String(g) : ''))
        .map((g) => normalize(g))
        .filter(Boolean)
    )
  );
};

export const isSuperAdminGroup = (groupName: string): boolean =>
  normalize(groupName) === 'superadmin';

export const isSuperAdminPrincipal = (principal: AdminPrincipal): boolean => {
  const groups = normalizeGroups(principal.groups);
  return groups.some(isSuperAdminGroup);
};

export const getImplicitInstanceGroupsFromPrincipal = (groups: string[]): string[] => {
  // Convention: group display name "admin-<instanceSlug>" grants access to that instance.
  // Example: admin-finance
  const out: string[] = [];
  for (const g of groups) {
    const match = g.match(/^admin[-_\s]+([a-z0-9-]+)$/i);
    if (match && match[1]) out.push(match[1].toLowerCase());
  }
  return Array.from(new Set(out));
};

export const getInstanceSlugsFromPrincipal = (principal: AdminPrincipal): string[] => {
  const groups = normalizeGroups(principal.groups);
  if (groups.length === 0) return [];
  return getImplicitInstanceGroupsFromPrincipal(groups);
};

export const isAdminPrincipalAllowedForInstance = (
  principal: AdminPrincipal,
  instance: Pick<RoadmapInstanceConfig, 'metadata' | 'slug'>
): boolean => {
  const normalizedUsername = normalize(principal.username);
  const groups = normalizeGroups(principal.groups);
  if (groups.some(isSuperAdminGroup)) return true;

  const accessConfig = getInstanceAdminAccessConfig(instance.metadata);
  if (normalizedUsername && accessConfig?.allowedUsers?.includes(normalizedUsername)) {
    return true;
  }
  if (
    accessConfig?.allowedGroups?.some((allowedGroup) => groups.includes(normalize(allowedGroup)))
  ) {
    return true;
  }

  // Default model: non-superadmins get access via explicit role config or implicit instance groups.
  const implicitSlugs = getImplicitInstanceGroupsFromPrincipal(groups);
  if (implicitSlugs.length === 0) return false;
  return implicitSlugs.includes(String(instance.slug || '').toLowerCase());
};

export const isAdminUserAllowedForInstance = (
  username: string | null | undefined,
  instance: Pick<RoadmapInstanceConfig, 'metadata'>
): boolean => {
  const normalizedUsername = normalize(username);
  if (!normalizedUsername) return false;
  const accessConfig = getInstanceAdminAccessConfig(instance.metadata);
  return Boolean(accessConfig?.allowedUsers?.includes(normalizedUsername));
};

export const filterInstancesForAdminUser = <T extends Pick<RoadmapInstanceConfig, 'metadata'>>(
  instances: T[],
  username: string | null | undefined
): T[] => {
  return instances.filter((inst) => isAdminUserAllowedForInstance(username, inst));
};

export const coerceAllowedUsersPayload = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value.map((entry) => normalize(entry)).filter(Boolean);
  return Array.from(new Set(normalized));
};

export const coerceAllowedGroupsPayload = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value.map((entry) => normalize(entry)).filter(Boolean);
  return Array.from(new Set(normalized));
};

const ensureRecordObject = (value: unknown): MutableSettingsRecord => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as MutableSettingsRecord;
  }
  return {};
};

export const normalizeAccessEntry = (value: unknown): string => normalize(value);

export const appendAllowedUser = (
  existingUsers: string[] | undefined,
  candidate: string | null | undefined
): string[] => {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return Array.isArray(existingUsers) ? [...existingUsers] : [];
  return Array.from(new Set([...(existingUsers ?? []), normalizedCandidate]));
};

export const removeAllowedUser = (
  existingUsers: string[] | undefined,
  candidate: string | null | undefined
): string[] => {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return Array.isArray(existingUsers) ? [...existingUsers] : [];
  return (existingUsers ?? []).filter((entry) => normalize(entry) !== normalizedCandidate);
};

export const updateInstanceAdminAccessMetadata = (opts: {
  settings: Record<string, unknown>;
  users?: string[];
  groups?: string[];
}): Record<string, unknown> => {
  const settings = ensureRecordObject(opts.settings);
  const metadata = ensureRecordObject(settings.metadata);
  const adminAccess = ensureRecordObject(metadata.adminAccess);

  const users = Array.isArray(opts.users) ? coerceAllowedUsersPayload(opts.users) : undefined;
  const groups = Array.isArray(opts.groups) ? coerceAllowedGroupsPayload(opts.groups) : undefined;

  if (users !== undefined) {
    if (users.length === 0) delete adminAccess.allowedUsers;
    else adminAccess.allowedUsers = users;
  }

  if (groups !== undefined) {
    if (groups.length === 0) delete adminAccess.allowedGroups;
    else adminAccess.allowedGroups = groups;
  }

  if (Object.keys(adminAccess).length === 0) delete metadata.adminAccess;
  else metadata.adminAccess = adminAccess;

  settings.metadata = metadata;
  return settings;
};
