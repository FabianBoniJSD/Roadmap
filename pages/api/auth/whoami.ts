import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminSession, isSuperAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const session = requireAdminSession(req);
    const groups = Array.isArray(session.groups)
      ? session.groups.filter((g): g is string => typeof g === 'string')
      : [];

    const debugInstance = typeof req.query.instance === 'string' ? req.query.instance : null;
    const debugGroup = typeof req.query.group === 'string' ? req.query.group : null;
    const spGroupMembership =
      debugInstance && debugGroup
        ? await clientDataService.withInstance(debugInstance, async () => {
            try {
              const entra = asRecord(session.entra);
              const entraUpn = entra && typeof entra.upn === 'string' ? entra.upn : null;
              const entraMail = entra && typeof entra.mail === 'string' ? entra.mail : null;
              const ok = await clientDataService.isUserInSharePointGroupByTitle(debugGroup, {
                username: typeof session.username === 'string' ? session.username : null,
                upn: entraUpn,
                mail: entraMail,
                displayName: typeof session.displayName === 'string' ? session.displayName : null,
              });
              return { instance: debugInstance, group: debugGroup, isMember: ok };
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              return { instance: debugInstance, group: debugGroup, isMember: false, error: msg };
            }
          })
        : null;

    return res.status(200).json({
      username: session.username ?? null,
      displayName: session.displayName ?? null,
      source: session.source ?? null,
      isAdmin: session.isAdmin === true,
      isSuperAdmin: isSuperAdminSession(session),
      groups,
      entra: session.entra ?? null,
      spGroupMembership,
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
