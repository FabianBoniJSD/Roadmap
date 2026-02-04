import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';

const normalize = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

export type InstanceAdminAccessConfig = {
  allowedUsers?: string[];
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

  return { allowedUsers: allowedUsers.length ? Array.from(new Set(allowedUsers)) : [] };
};

export const isAdminUserAllowedForInstance = (
  username: string | null | undefined,
  instance: Pick<RoadmapInstanceConfig, 'metadata'>
): boolean => {
  const normalizedUser = normalize(username);
  const cfg = getInstanceAdminAccessConfig(instance.metadata);
  const allowed = cfg?.allowedUsers ?? [];

  // No allowlist configured => allow.
  if (!allowed.length) return true;
  if (!normalizedUser) return false;
  return allowed.includes(normalizedUser);
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
