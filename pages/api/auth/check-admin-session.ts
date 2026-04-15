import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { isAdminSessionAllowedForInstance } from '@/utils/instanceAccessServer';
import { isSuperAdminSessionWithSharePointFallback } from '@/utils/superAdminAccessServer';

/**
 * Check if the current session has a valid JWT token
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = extractAdminSession(req);
    if (!session) {
      return res
        .status(403)
        .json({ authenticated: false, isAdmin: false, error: 'No token provided' });
    }

    const requestHeaders = {
      authorization:
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
    };

    const groups = Array.isArray(session.groups)
      ? session.groups.filter((g): g is string => typeof g === 'string')
      : [];
    const entra =
      session.entra && typeof session.entra === 'object'
        ? (session.entra as Record<string, unknown>)
        : null;
    const department =
      (entra && typeof entra.department === 'string' ? entra.department : null) ||
      (typeof session.department === 'string' ? session.department : null);

    const candidateInstanceSlugs = (
      await prisma.roadmapInstance.findMany({ select: { slug: true }, orderBy: { slug: 'asc' } })
    )
      .map((record) => String(record.slug || '').trim())
      .filter(Boolean);

    const isSuperAdmin = await isSuperAdminSessionWithSharePointFallback(session, {
      candidateInstanceSlugs,
      requestHeaders,
    });

    let isAdmin = isSuperAdmin;
    if (!isAdmin) {
      for (const slug of candidateInstanceSlugs) {
        if (
          await isAdminSessionAllowedForInstance({
            session,
            instance: { slug },
            requestHeaders,
            knownSuperAdmin: false,
          })
        ) {
          isAdmin = true;
          break;
        }
      }
    }

    return res.status(200).json({
      authenticated: true,
      isAdmin,
      username: session.displayName || session.username,
      department,
      groups,
      isSuperAdmin,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[check-admin-session] Error:', error);
    return res.status(500).json({
      authenticated: false,
      isAdmin: false,
      error: errorMessage,
    });
  }
}
