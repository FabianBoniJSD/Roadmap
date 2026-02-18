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

const getImplicitInstanceGroupsFromPrincipal = (groups: string[]): string[] => {
  // Convention: group display name "admin-<instanceSlug>" grants access to that instance.
  // Example: admin-finance
  const out: string[] = [];
  for (const g of groups) {
    const match = g.match(/^admin[-_\s]+([a-z0-9-]+)$/i);
    if (match && match[1]) out.push(match[1].toLowerCase());
  }
  return Array.from(new Set(out));
};

export const isAdminPrincipalAllowedForInstance = (
  principal: AdminPrincipal,
  instance: Pick<RoadmapInstanceConfig, 'metadata' | 'slug'>
): boolean => {
  const normalizedUser = normalize(principal.username);
  const groups = normalizeGroups(principal.groups);
  const cfg = getInstanceAdminAccessConfig(instance.metadata);
  const allowedUsers = cfg?.allowedUsers ?? [];
  const allowedGroups = cfg?.allowedGroups ?? [];

  // Backwards compatible: no allowlist config => allow.
  if (!allowedUsers.length && !allowedGroups.length && groups.length === 0) return true;

  // If user has any implicit admin-<slug> groups, constrain them to those instances.
  const implicitSlugs = getImplicitInstanceGroupsFromPrincipal(groups);
  if (implicitSlugs.length > 0) {
    return implicitSlugs.includes(String(instance.slug || '').toLowerCase());
  }

  if (allowedGroups.length > 0 && groups.length > 0) {
    if (groups.some((g) => allowedGroups.includes(g))) return true;
  }

  if (!allowedUsers.length && allowedGroups.length > 0) {
    // Group allowlist configured but no username => deny.
    return false;
  }

  // No allowlist configured => allow.
  if (!allowedUsers.length && !allowedGroups.length) return true;
  if (!normalizedUser) return false;
  return allowedUsers.includes(normalizedUser);
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
