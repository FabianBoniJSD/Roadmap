import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
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
  serializeExtraModes,
  serializeSettings,
} from './helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const instances = await prisma.roadmapInstance.findMany({
      include: { hosts: true },
      orderBy: { slug: 'asc' },
    });
    return res
      .status(200)
      .json({ instances: instances.map((record) => toInstanceSummary(mapInstanceRecord(record))) });
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

    const created = await prisma.roadmapInstance.create({
      data: {
        slug: normalizedSlug,
        displayName: displayName.trim(),
        department: department?.trim() || null,
        description: description?.trim() || null,
        sharePointSiteUrlDev: sharePoint.siteUrlDev.trim(),
        sharePointSiteUrlProd: (sharePoint.siteUrlProd || sharePoint.siteUrlDev).trim(),
        sharePointStrategy: sharePoint.strategy || 'onprem',
        spUsername: sharePoint.username.trim(),
        spPassword: sharePoint.password.trim(),
        spDomain: sharePoint.domain?.trim() || null,
        spWorkstation: sharePoint.workstation?.trim() || null,
        allowSelfSigned: coerceBool(sharePoint.allowSelfSigned),
        needsProxy: coerceBool(sharePoint.needsProxy),
        forceSingleCreds: coerceBool(sharePoint.forceSingleCreds),
        authNoCache: coerceBool(sharePoint.authNoCache),
        manualNtlmFallback: coerceBool(sharePoint.manualNtlmFallback),
        ntlmPersistentSocket: coerceBool(sharePoint.ntlmPersistentSocket),
        ntlmSocketProbe: coerceBool(sharePoint.ntlmSocketProbe),
        extraAuthModes: serializeExtraModes(sharePoint.extraModes),
        trustedCaPath: sharePoint.trustedCaPath?.trim() || null,
        deploymentEnv: deploymentEnv?.trim() || null,
        defaultLocale: defaultLocale?.trim() || null,
        defaultTimeZone: defaultTimeZone?.trim() || null,
        settingsJson: serializeSettings(settings),
        hosts: {
          create: hosts.map((host) => ({ host })),
        },
      },
      include: { hosts: true },
    });

    return res.status(201).json({ instance: toInstanceSummary(mapInstanceRecord(created)) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
