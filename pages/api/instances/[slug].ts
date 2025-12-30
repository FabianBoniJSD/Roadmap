import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';
import { mapInstanceRecord, toInstanceSummary } from '@/utils/instanceConfig';
import {
  buildSettingsPayload,
  coerceBool,
  normalizeHosts,
  sanitizeSlug,
  serializeExtraModes,
  serializeSettings,
} from './helpers';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';

const hasProp = (value: unknown, key: string): boolean =>
  Boolean(value && typeof value === 'object' && key in (value as Record<string, unknown>));

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

  const ensureAdminForInstance = async (
    record: Awaited<ReturnType<typeof prisma.roadmapInstance.findUnique>> | null
  ) => {
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
    const record = await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    });
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    if (!(await ensureAdminForInstance(record)))
      return res.status(401).json({ error: 'Unauthorized' });
    return res.status(200).json({ instance: toInstanceSummary(mapInstanceRecord(record)) });
  }

  if (req.method === 'PUT') {
    const existing = await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    });
    if (!existing) return res.status(404).json({ error: 'Instance not found' });
    if (!(await ensureAdminForInstance(existing)))
      return res.status(401).json({ error: 'Unauthorized' });

    const sharePoint = req.body?.sharePoint || {};
    const data: Record<string, unknown> = {};

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
    if (sharePoint.strategy && typeof sharePoint.strategy === 'string') {
      data.sharePointStrategy = sharePoint.strategy;
    }
    if (sharePoint.username && typeof sharePoint.username === 'string') {
      data.spUsername = sharePoint.username.trim();
    }
    if (sharePoint.password && typeof sharePoint.password === 'string') {
      data.spPassword = sharePoint.password.trim();
    }
    if (sharePoint.domain !== undefined) {
      data.spDomain =
        typeof sharePoint.domain === 'string' && sharePoint.domain.trim()
          ? sharePoint.domain.trim()
          : null;
    }
    if (sharePoint.workstation !== undefined) {
      data.spWorkstation =
        typeof sharePoint.workstation === 'string' && sharePoint.workstation.trim()
          ? sharePoint.workstation.trim()
          : null;
    }
    if (hasProp(sharePoint, 'allowSelfSigned')) {
      data.allowSelfSigned = coerceBool(sharePoint.allowSelfSigned);
    }
    if (hasProp(sharePoint, 'needsProxy')) {
      data.needsProxy = coerceBool(sharePoint.needsProxy);
    }
    if (hasProp(sharePoint, 'forceSingleCreds')) {
      data.forceSingleCreds = coerceBool(sharePoint.forceSingleCreds);
    }
    if (hasProp(sharePoint, 'authNoCache')) {
      data.authNoCache = coerceBool(sharePoint.authNoCache);
    }
    if (hasProp(sharePoint, 'manualNtlmFallback')) {
      data.manualNtlmFallback = coerceBool(sharePoint.manualNtlmFallback);
    }
    if (hasProp(sharePoint, 'ntlmPersistentSocket')) {
      data.ntlmPersistentSocket = coerceBool(sharePoint.ntlmPersistentSocket);
    }
    if (hasProp(sharePoint, 'ntlmSocketProbe')) {
      data.ntlmSocketProbe = coerceBool(sharePoint.ntlmSocketProbe);
    }
    if (hasProp(sharePoint, 'extraModes')) {
      data.extraAuthModes = serializeExtraModes(sharePoint.extraModes);
    }
    if (sharePoint.trustedCaPath !== undefined) {
      data.trustedCaPath =
        typeof sharePoint.trustedCaPath === 'string' && sharePoint.trustedCaPath.trim()
          ? sharePoint.trustedCaPath.trim()
          : null;
    }

    const settings = buildSettingsPayload(req.body);
    if (settings) {
      data.settingsJson = serializeSettings(settings);
    }

    let updated = await prisma.roadmapInstance.update({
      where: { slug },
      data,
      include: { hosts: true },
    });

    if (Array.isArray(req.body?.hosts)) {
      const normalizedHosts = normalizeHosts(req.body.hosts);
      await updateHosts(updated.id, normalizedHosts);
      updated = await prisma.roadmapInstance.findUniqueOrThrow({
        where: { slug },
        include: { hosts: true },
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

    updated = await prisma.roadmapInstance.update({
      where: { id: updated.id },
      data: {
        spHealthJson: JSON.stringify(health),
        spHealthCheckedAt: new Date(),
      },
      include: { hosts: true },
    });

    return res.status(200).json({ instance: toInstanceSummary(mapInstanceRecord(updated)) });
  }

  if (req.method === 'DELETE') {
    const existing = await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    });
    if (!existing) return res.status(404).json({ error: 'Instance not found' });
    if (!(await ensureAdminForInstance(existing)))
      return res.status(401).json({ error: 'Unauthorized' });
    try {
      await prisma.roadmapInstance.delete({ where: { slug } });
      return res.status(204).end();
    } catch {
      return res.status(404).json({ error: 'Instance not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
