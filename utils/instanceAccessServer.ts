import type { AdminSessionPayload } from '@/utils/apiAuth';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { clientDataService } from '@/utils/clientDataService';
import { isAdminPrincipalAllowedForInstance } from '@/utils/instanceAccess';
import {
  isAnyDepartmentCandidateAllowedForInstance,
  normalizeDepartment,
} from '@/utils/instanceDepartmentAccess';
import { isSuperAdminSessionWithSharePointFallback } from '@/utils/superAdminAccessServer';

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
  const groups = Array.isArray(session?.groups)
    ? session.groups.filter((g): g is string => typeof g === 'string')
    : [];
  return { username, upn, mail, displayName, department, groups };
};

export async function isAdminSessionAllowedForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug'>;
}): Promise<boolean> {
  const { session, instance } = opts;

  if (await isSuperAdminSessionWithSharePointFallback(session)) {
    return true;
  }

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
  if (!ids.department) {
    const resolvedOnPremDepartment = await clientDataService.withInstance(
      String(instance.slug || ''),
      () =>
        clientDataService.resolveUserDepartmentFromSharePoint({
          username: ids.username,
          upn: ids.upn,
          mail: ids.mail,
          displayName: ids.displayName,
        })
    );
    if (resolvedOnPremDepartment) {
      ids.department = resolvedOnPremDepartment;
    }
  }

  const departmentCandidates = Array.from(
    new Set(
      [ids.department, ...ids.groups].map((value) => normalizeDepartment(value)).filter(Boolean)
    )
  );
  if (departmentCandidates.length > 0) {
    const allowedByDepartment = await isAnyDepartmentCandidateAllowedForInstance({
      instanceSlug: String(instance.slug || ''),
      candidates: departmentCandidates,
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
