import type { AdminSessionPayload } from '@/utils/apiAuth';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { clientDataService } from '@/utils/clientDataService';
import { isAdminPrincipalAllowedForInstance } from '@/utils/instanceAccess';
import {
  isDepartmentAllowedForInstance,
  normalizeDepartment,
} from '@/utils/instanceDepartmentAccess';

type Principal = { username: string | null; groups?: unknown };

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const extractIdentifiers = (session: AdminSessionPayload | null | undefined) => {
  const username = typeof session?.username === 'string' ? session.username : null;
  const displayName = typeof session?.displayName === 'string' ? session.displayName : null;
  const sessionRecord = asRecord(session);
  const entra = asRecord(session?.entra);
  const upn = entra && typeof entra.upn === 'string' ? entra.upn : null;
  const mail = entra && typeof entra.mail === 'string' ? entra.mail : null;
  const department =
    (entra && typeof entra.department === 'string' ? entra.department : null) ||
    (sessionRecord && typeof sessionRecord.department === 'string'
      ? sessionRecord.department
      : null);
  return { username, upn, mail, displayName, department };
};

export async function isAdminSessionAllowedForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug'>;
}): Promise<boolean> {
  const { session, instance } = opts;
  const principal: Principal = {
    username:
      (typeof session?.username === 'string' && session.username) ||
      (typeof session?.displayName === 'string' && session.displayName) ||
      null,
    groups: session?.groups,
  };

  // Fast path: token already contains the needed groups.
  if (isAdminPrincipalAllowedForInstance(principal, instance)) return true;

  // DB-based department access: allow instance access when the user's department
  // is explicitly linked to the instance.
  const ids = extractIdentifiers(session);
  const normalizedDepartment = normalizeDepartment(ids.department);
  if (normalizedDepartment) {
    const allowedByDepartment = await isDepartmentAllowedForInstance({
      instanceSlug: String(instance.slug || ''),
      department: normalizedDepartment,
    });
    if (allowedByDepartment) return true;
  }

  // Fallback: for Entra sessions (or missing token group claims), verify membership
  // in the SharePoint site group "admin-<instanceSlug>" using the service account.
  const groupTitle = `admin-${String(instance.slug || '').toLowerCase()}`;

  return await clientDataService.withInstance(String(instance.slug || ''), async () => {
    const [inAdminGroup, inSuperAdminGroup] = await Promise.all([
      clientDataService.isUserInSharePointGroupByTitle(groupTitle, ids),
      clientDataService.isUserInSharePointGroupByTitle('superadmin', ids),
    ]);
    return Boolean(inAdminGroup || inSuperAdminGroup);
  });
}
