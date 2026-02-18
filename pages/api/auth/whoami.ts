import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminSession, isSuperAdminSession } from '@/utils/apiAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const session = requireAdminSession(req);
    const groups = Array.isArray(session.groups)
      ? session.groups.filter((g): g is string => typeof g === 'string')
      : [];

    return res.status(200).json({
      username: session.username ?? null,
      displayName: session.displayName ?? null,
      source: session.source ?? null,
      isAdmin: session.isAdmin === true,
      isSuperAdmin: isSuperAdminSession(session),
      groups,
      entra: session.entra ?? null,
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
