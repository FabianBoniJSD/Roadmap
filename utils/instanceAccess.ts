import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const normalize = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

export type InstanceAdminAccessConfig = {
  allowedUsers?: string[];
  allowedGroups?: string[];
};

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
  const groups = normalizeGroups(principal.groups);
  if (groups.some(isSuperAdminGroup)) return true;

  // Strict model: non-superadmins only get access via implicit instance groups.
  const implicitSlugs = getImplicitInstanceGroupsFromPrincipal(groups);
  if (implicitSlugs.length === 0) return false;
  return implicitSlugs.includes(String(instance.slug || '').toLowerCase());
};

export const isAdminUserAllowedForInstance = (
  username: string | null | undefined,
  instance: Pick<RoadmapInstanceConfig, 'metadata'>
): boolean => {
  return isAdminPrincipalAllowedForInstance(
    { username, groups: null },
    { metadata: instance.metadata, slug: '' }
  );
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
