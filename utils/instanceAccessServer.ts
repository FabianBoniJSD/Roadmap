import type { AdminSessionPayload } from '@/utils/apiAuth';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { clientDataService } from '@/utils/clientDataService';
import { getInstanceConfigBySlug } from '@/utils/instanceConfig';
import {
  isAdminPrincipalAllowedForInstance,
  isAdminUserAllowedForInstance,
} from '@/utils/instanceAccess';
import {
  isAnyDepartmentCandidateAllowedForInstance,
  normalizeDepartment,
} from '@/utils/instanceDepartmentAccess';
import { isSuperAdminSessionWithSharePointFallback } from '@/utils/superAdminAccessServer';

type Principal = { username: string | null; groups?: unknown };
type ForwardedRequestHeaders = { authorization?: string; cookie?: string };

type InstanceAccessMode = 'read' | 'admin';

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

async function isSessionAllowedForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug' | 'metadata'>;
  requestHeaders?: ForwardedRequestHeaders;
  mode: InstanceAccessMode;
}): Promise<boolean> {
  const { session, instance } = opts;

  const effectiveInstance =
    instance.metadata !== undefined
      ? instance
      : ((await getInstanceConfigBySlug(String(instance.slug || ''))) ?? instance);

  if (
    await isSuperAdminSessionWithSharePointFallback(session, {
      requestHeaders: opts.requestHeaders,
    })
  ) {
    return true;
  }

  const principal: Principal = {
    username:
      (typeof session?.username === 'string' && session.username) ||
      (typeof session?.displayName === 'string' && session.displayName) ||
      null,
    groups: session?.groups,
  };

  const ids = extractIdentifiers(session);
  const directUserCandidates = [ids.username, ids.upn, ids.mail, ids.displayName];
  if (
    directUserCandidates.some((candidate) =>
      isAdminUserAllowedForInstance(candidate, effectiveInstance)
    )
  ) {
    return true;
  }

  // Token-derived implicit admin groups can be stale until the next login.
  // They are acceptable as a read hint, but admin access must be revalidated live.
  if (opts.mode === 'read' && isAdminPrincipalAllowedForInstance(principal, effectiveInstance)) {
    return true;
  }

  if (opts.mode === 'read') {
    // Department-linked users may view an instance but never gain admin rights from that alone.
    if (!ids.department) {
      const resolvedOnPremDepartment = await clientDataService.withRequestHeaders(
        opts.requestHeaders,
        () =>
          clientDataService.withInstance(String(effectiveInstance.slug || ''), () =>
            clientDataService.resolveUserDepartmentFromSharePoint({
              username: ids.username,
              upn: ids.upn,
              mail: ids.mail,
              displayName: ids.displayName,
            })
          )
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
        instanceSlug: String(effectiveInstance.slug || ''),
        candidates: departmentCandidates,
      });
      if (allowedByDepartment) return true;
    }
  }

  // Fallback: for Entra sessions (or missing token group claims), verify membership
  // in the SharePoint site group "admin-<instanceSlug>" using the service account.
  const groupTitle = `admin-${String(instance.slug || '').toLowerCase()}`;

  try {
    return await clientDataService.withRequestHeaders(opts.requestHeaders, () =>
      clientDataService.withInstance(String(effectiveInstance.slug || ''), async () => {
        const [inAdminGroup, inSuperAdminGroup] = await Promise.all([
          clientDataService.isUserInSharePointGroupByTitle(groupTitle, ids),
          clientDataService.isUserInSharePointGroupByTitle('superadmin', ids),
        ]);
        return Boolean(inAdminGroup || inSuperAdminGroup);
      })
    );
  } catch (error) {
    console.warn('[instanceAccess] SharePoint membership fallback failed', {
      slug: String(effectiveInstance.slug || ''),
      error,
    });
    return false;
  }
}

export async function isSessionExplicitlyAllowedByDepartmentForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug' | 'metadata'>;
  requestHeaders?: ForwardedRequestHeaders;
}): Promise<boolean> {
  const effectiveInstance =
    opts.instance.metadata !== undefined
      ? opts.instance
      : ((await getInstanceConfigBySlug(String(opts.instance.slug || ''))) ?? opts.instance);

  if (
    await isSuperAdminSessionWithSharePointFallback(opts.session, {
      requestHeaders: opts.requestHeaders,
    })
  ) {
    return true;
  }

  const ids = extractIdentifiers(opts.session);
  if (!ids.department) {
    const resolvedOnPremDepartment = await clientDataService.withRequestHeaders(
      opts.requestHeaders,
      () =>
        clientDataService.withInstance(String(effectiveInstance.slug || ''), () =>
          clientDataService.resolveUserDepartmentFromSharePoint({
            username: ids.username,
            upn: ids.upn,
            mail: ids.mail,
            displayName: ids.displayName,
          })
        )
    );
    if (resolvedOnPremDepartment) {
      ids.department = resolvedOnPremDepartment;
    }
  }

  const departmentCandidates = Array.from(
    new Set([ids.department].map((value) => normalizeDepartment(value)).filter(Boolean))
  );
  if (departmentCandidates.length === 0) return false;

  return isAnyDepartmentCandidateAllowedForInstance({
    instanceSlug: String(effectiveInstance.slug || ''),
    candidates: departmentCandidates,
  });
}

export async function isAdminSessionAllowedForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug' | 'metadata'>;
  requestHeaders?: ForwardedRequestHeaders;
}): Promise<boolean> {
  return isSessionAllowedForInstance({ ...opts, mode: 'admin' });
}

export async function isReadSessionAllowedForInstance(opts: {
  session: AdminSessionPayload;
  instance: Pick<RoadmapInstanceConfig, 'slug' | 'metadata'>;
  requestHeaders?: ForwardedRequestHeaders;
}): Promise<boolean> {
  return isSessionAllowedForInstance({ ...opts, mode: 'read' });
}
