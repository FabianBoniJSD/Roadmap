import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/utils/apiAuth';
import { mapInstanceRecord, toInstanceSummary } from '@/utils/instanceConfig';
import {
  buildSettingsPayload,
  coerceBool,
  normalizeHosts,
  sanitizeSlug,
  serializeExtraModes,
  serializeSettings,
} from './helpers';

const hasProp = (value: unknown, key: string): boolean =>
  Boolean(value && typeof value === 'object' && key in (value as Record<string, unknown>));

async function updateHosts(instanceId: number, hosts: string[]) {
  await prisma.roadmapInstanceHost.deleteMany({ where: { instanceId } });
  for (const host of hosts) {
    await prisma.roadmapInstanceHost.create({ data: { host, instanceId } });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    requireAdminSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

  if (req.method === 'GET') {
    const record = await prisma.roadmapInstance.findUnique({
      where: { slug },
      include: { hosts: true },
    });
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    return res.status(200).json({ instance: toInstanceSummary(mapInstanceRecord(record)) });
  }

  if (req.method === 'PUT') {
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

    return res.status(200).json({ instance: toInstanceSummary(mapInstanceRecord(updated)) });
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.roadmapInstance.delete({ where: { slug } });
      return res.status(204).end();
    } catch {
      return res.status(404).json({ error: 'Instance not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
