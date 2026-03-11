import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireSuperAdminAccess } from '@/utils/superAdminAccessServer';
import {
  getInstanceConfigBySlug,
  mapInstanceRecord,
  toInstanceSummary,
} from '@/utils/instanceConfig';
import { buildSettingsPayload, normalizeHosts, sanitizeSlug, serializeSettings } from './helpers';
import { provisionSharePointForInstance } from '@/utils/sharePointProvisioning';
import type { RoadmapInstanceHealth } from '@/types/roadmapInstance';
import {
  getAllowedDepartmentsForInstanceSlugs,
  parseDepartmentsPayload,
  replaceAllowedDepartmentsForInstance,
} from '@/utils/instanceDepartmentAccess';

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

    const allowedBySlug = await getAllowedDepartmentsForInstanceSlugs(summaries.map((s) => s.slug));

    const enriched = summaries.map((summary) => ({
      ...summary,
      allowedDepartments: allowedBySlug[String(summary.slug).toLowerCase()] || [],
    }));

    return res.status(200).json({ instances: enriched });
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
        sharePointStrategy: forcedStrategy,
        spUsername: forcedUsername,
        spPassword: forcedPassword,
        allowSelfSigned: forcedAllowSelfSigned,
        trustedCaPath: forcedTrustedCaPath,
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

    const allowedDepartments = parseDepartmentsPayload(req.body?.allowedDepartments);
    await replaceAllowedDepartmentsForInstance({
      instanceSlug: normalizedSlug,
      departments: allowedDepartments,
    });

    const [allowedBySlug] = await Promise.all([
      getAllowedDepartmentsForInstanceSlugs([normalizedSlug]),
    ]);

    const summary = toInstanceSummary(mapInstanceRecord(created));
    const enriched = {
      ...summary,
      allowedDepartments: allowedBySlug[normalizedSlug] || [],
    };

    return res.status(201).json({ instance: enriched });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
