import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { requireSuperAdminAccess } from '@/utils/superAdminAccessServer';
import { clientDataService } from '@/utils/clientDataService';
import {
  mapInstanceRecord,
  toInstanceSummary,
  type PrismaInstanceWithHosts,
} from '@/utils/instanceConfig';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { buildSettingsPayload, normalizeHosts, sanitizeSlug, serializeSettings } from './helpers';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';
import {
  deleteDepartmentAccessForInstance,
  getAllowedDepartmentsForInstanceSlugs,
  parseDepartmentsPayload,
  replaceAllowedDepartmentsForInstance,
} from '@/utils/instanceDepartmentAccess';

async function updateHosts(instanceId: number, hosts: string[]) {
  await prisma.roadmapInstanceHost.deleteMany({ where: { instanceId } });
  for (const host of hosts) {
    await prisma.roadmapInstanceHost.create({ data: { host, instanceId } });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug;
  const slug =
    typeof slugParam === 'string'
      ? sanitizeSlug(slugParam)
      : Array.isArray(slugParam) && slugParam.length > 0
        ? sanitizeSlug(slugParam[0])
        : null;

  if (!slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  const session = extractAdminSession(req);
  const forwardedHeaders = {
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
    cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
  };

  const ensureAdminForInstance = async (record: PrismaInstanceWithHosts | null) => {
    if (session?.isAdmin) return true;
    if (!record) return false;
    try {
      const mapped = mapInstanceRecord(record);
      return await clientDataService.withInstance(mapped.slug, () =>
        clientDataService.isCurrentUserAdmin()
      );
    } catch (error) {
      console.error('[instances] service-account admin check failed', error);
      return false;
    }
  };

  if (req.method === 'GET') {
    const record = (await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    })) as PrismaInstanceWithHosts | null;
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    const mapped = mapInstanceRecord(record);
    if (
      session?.isAdmin &&
      !(await isAdminSessionAllowedForInstance({
        session,
        instance: mapped,
        requestHeaders: forwardedHeaders,
      }))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!(await ensureAdminForInstance(record)))
      return res.status(401).json({ error: 'Unauthorized' });
    const allowedBySlug = await getAllowedDepartmentsForInstanceSlugs([mapped.slug]);
    const summary = toInstanceSummary(mapped);
    return res.status(200).json({
      instance: {
        ...summary,
        allowedDepartments: allowedBySlug[String(mapped.slug).toLowerCase()] || [],
      },
    });
  }

  if (req.method === 'PUT') {
    try {
      await requireSuperAdminAccess(req);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Forbidden';
      const status = msg === 'Unauthorized' ? 401 : 403;
      return res.status(status).json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' });
    }

    const existing = (await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    })) as PrismaInstanceWithHosts | null;
    if (!existing) return res.status(404).json({ error: 'Instance not found' });
    void mapInstanceRecord(existing);

    const sharePoint = req.body?.sharePoint || {};
    const data: Record<string, unknown> = {};
    const forcedStrategy = String(process.env.SP_STRATEGY || 'kerberos')
      .trim()
      .toLowerCase();
    const forcedUsername =
      process.env.SP_KERBEROS_SERVICE_USER ||
      process.env.SP_USERNAME ||
      process.env.USER_NAME ||
      '';
    const forcedPassword =
      process.env.SP_KERBEROS_SERVICE_PASSWORD ||
      process.env.SP_PASSWORD ||
      process.env.USER_PASSWORD ||
      '';
    const forcedAllowSelfSigned =
      process.env.SP_ALLOW_SELF_SIGNED === 'true' ||
      process.env.SP_TLS_FALLBACK_INSECURE === 'true';
    const forcedTrustedCaPath = process.env.SP_TRUSTED_CA_PATH?.trim() || null;

    if (req.body.displayName && typeof req.body.displayName === 'string') {
      data.displayName = req.body.displayName.trim();
    }
    if (req.body.department !== undefined) {
      data.department =
        typeof req.body.department === 'string' && req.body.department.trim()
          ? req.body.department.trim()
          : null;
    }
    if (req.body.description !== undefined) {
      data.description =
        typeof req.body.description === 'string' && req.body.description.trim()
          ? req.body.description.trim()
          : null;
    }
    if (req.body.deploymentEnv !== undefined) {
      data.deploymentEnv =
        typeof req.body.deploymentEnv === 'string' && req.body.deploymentEnv.trim()
          ? req.body.deploymentEnv.trim()
          : null;
    }
    if (req.body.defaultLocale !== undefined) {
      data.defaultLocale =
        typeof req.body.defaultLocale === 'string' && req.body.defaultLocale.trim()
          ? req.body.defaultLocale.trim()
          : null;
    }
    if (req.body.defaultTimeZone !== undefined) {
      data.defaultTimeZone =
        typeof req.body.defaultTimeZone === 'string' && req.body.defaultTimeZone.trim()
          ? req.body.defaultTimeZone.trim()
          : null;
    }
    if (req.body.landingPage !== undefined) {
      data.landingPage =
        typeof req.body.landingPage === 'string' && req.body.landingPage.trim()
          ? req.body.landingPage.trim()
          : null;
    }

    if (sharePoint.siteUrlDev && typeof sharePoint.siteUrlDev === 'string') {
      data.sharePointSiteUrlDev = sharePoint.siteUrlDev.trim();
    }
    if (sharePoint.siteUrlProd && typeof sharePoint.siteUrlProd === 'string') {
      data.sharePointSiteUrlProd = sharePoint.siteUrlProd.trim();
    }
    data.sharePointStrategy = forcedStrategy;
    data.spUsername = forcedUsername;
    data.spPassword = forcedPassword;
    data.allowSelfSigned = forcedAllowSelfSigned;
    data.trustedCaPath = forcedTrustedCaPath;

    const settings = buildSettingsPayload(req.body);
    if (settings) {
      data.settingsJson = serializeSettings(settings);
    }

    let updated = (await prisma.roadmapInstance.update({
      where: { slug },
      data,
      include: { hosts: true },
    })) as PrismaInstanceWithHosts;

    if (Array.isArray(req.body?.hosts)) {
      const normalizedHosts = normalizeHosts(req.body.hosts);
      await updateHosts(updated.id, normalizedHosts);
      updated = (await prisma.roadmapInstance.findUniqueOrThrow({
        where: { slug },
        include: { hosts: true },
      })) as PrismaInstanceWithHosts;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'allowedDepartments')) {
      const allowedDepartments = parseDepartmentsPayload(req.body?.allowedDepartments);
      await replaceAllowedDepartmentsForInstance({
        instanceSlug: slug,
        departments: allowedDepartments,
      });
    }

    const mapped = mapInstanceRecord(updated);
    let health: RoadmapInstanceHealth;
    try {
      health = await provisionSharePointForInstance(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      health = {
        checkedAt: new Date().toISOString(),
        permissions: { status: 'error', message },
        lists: {
          ensured: [],
          created: [],
          missing: [],
          fieldsCreated: {},
          errors: { __provision: message },
        },
      };
      // eslint-disable-next-line no-console
      console.error('[instances] sharepoint provisioning failed', error);
    }

    updated = (await prisma.roadmapInstance.update({
      where: { id: updated.id },
      data: {
        spHealthJson: JSON.stringify(health),
        spHealthCheckedAt: new Date(),
      },
      include: { hosts: true },
    })) as PrismaInstanceWithHosts;

    const remapped = mapInstanceRecord(updated);
    const allowedBySlug = await getAllowedDepartmentsForInstanceSlugs([remapped.slug]);
    const summary = toInstanceSummary(remapped);
    return res.status(200).json({
      instance: {
        ...summary,
        allowedDepartments: allowedBySlug[String(remapped.slug).toLowerCase()] || [],
      },
    });
  }

  if (req.method === 'DELETE') {
    try {
      await requireSuperAdminAccess(req);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Forbidden';
      const status = msg === 'Unauthorized' ? 401 : 403;
      return res.status(status).json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' });
    }

    const existing = (await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    })) as PrismaInstanceWithHosts | null;
    if (!existing) return res.status(404).json({ error: 'Instance not found' });
    try {
      await deleteDepartmentAccessForInstance(slug);
      await prisma.roadmapInstance.delete({ where: { slug } });
      return res.status(204).end();
    } catch {
      return res.status(404).json({ error: 'Instance not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
