import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireSuperAdminAccess } from '@/utils/superAdminAccessServer';
import {
  getInstanceConfigBySlug,
  mapInstanceRecord,
  toInstanceSummary,
} from '@/utils/instanceConfig';
import {
  buildSettingsPayload,
  coerceBool,
  normalizeHosts,
  sanitizeSlug,
  serializeSettings,
} from './helpers';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireSuperAdminAccess(req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    const status = msg === 'Unauthorized' ? 401 : 403;
    return res.status(status).json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' });
  }

  if (req.method === 'GET') {
    const instances = await prisma.roadmapInstance.findMany({
      include: { hosts: true },
      orderBy: { slug: 'asc' },
    });

    const summaries = instances
      .map((record) => mapInstanceRecord(record))
      .map((instance) => toInstanceSummary(instance));

    return res.status(200).json({ instances: summaries });
  }

  if (req.method === 'POST') {
    const {
      slug,
      displayName,
      department,
      description,
      deploymentEnv,
      defaultLocale,
      defaultTimeZone,
      landingPage,
    } = req.body || {};
    const sharePoint = req.body?.sharePoint || {};

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'slug is required' });
    }
    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'displayName is required' });
    }
    if (!sharePoint.siteUrlDev || typeof sharePoint.siteUrlDev !== 'string') {
      return res.status(400).json({ error: 'sharePoint.siteUrlDev is required' });
    }
    if (!sharePoint.username || typeof sharePoint.username !== 'string') {
      return res.status(400).json({ error: 'sharePoint.username is required' });
    }
    if (!sharePoint.password || typeof sharePoint.password !== 'string') {
      return res.status(400).json({ error: 'sharePoint.password is required' });
    }

    const normalizedSlug = sanitizeSlug(slug);
    const existing = await getInstanceConfigBySlug(normalizedSlug);
    if (existing) {
      return res.status(409).json({ error: `Instance "${normalizedSlug}" already exists` });
    }

    const settings = buildSettingsPayload(req.body);
    const hosts = normalizeHosts(req.body?.hosts);
    const landingPageValue =
      typeof landingPage === 'string' && landingPage.trim() ? landingPage.trim() : null;

    let created = await prisma.roadmapInstance.create({
      data: {
        slug: normalizedSlug,
        displayName: displayName.trim(),
        department: department?.trim() || null,
        description: description?.trim() || null,
        sharePointSiteUrlDev: sharePoint.siteUrlDev.trim(),
        sharePointSiteUrlProd: (sharePoint.siteUrlProd || sharePoint.siteUrlDev).trim(),
        sharePointStrategy: sharePoint.strategy || 'kerberos',
        spUsername: sharePoint.username.trim(),
        spPassword: sharePoint.password.trim(),
        allowSelfSigned: coerceBool(sharePoint.allowSelfSigned),
        trustedCaPath: sharePoint.trustedCaPath?.trim() || null,
        deploymentEnv: deploymentEnv?.trim() || null,
        defaultLocale: defaultLocale?.trim() || null,
        defaultTimeZone: defaultTimeZone?.trim() || null,
        landingPage: landingPageValue,
        settingsJson: serializeSettings(settings),
        hosts: {
          create: hosts.map((host) => ({ host })),
        },
      },
      include: { hosts: true },
    });

    const mapped = mapInstanceRecord(created);
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

    created = await prisma.roadmapInstance.update({
      where: { id: created.id },
      data: {
        spHealthJson: JSON.stringify(health),
        spHealthCheckedAt: new Date(),
      },
      include: { hosts: true },
    });

    return res.status(201).json({ instance: toInstanceSummary(mapInstanceRecord(created)) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
