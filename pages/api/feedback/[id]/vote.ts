import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUserSession } from '@/utils/apiAuth';

type ApiResponse = { success: true; userVote: -1 | 0 | 1 } | { error: string };

const disableCache = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

const normalizeUserKey = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const getSessionUserKey = (session: ReturnType<typeof requireUserSession>): string => {
  const entra = session.entra && typeof session.entra === 'object' ? session.entra : null;
  return (
    normalizeUserKey(entra?.upn) ||
    normalizeUserKey(entra?.mail) ||
    normalizeUserKey(session.username) ||
    normalizeUserKey(session.displayName)
  );
};

const parseFeedbackId = (raw: unknown): number | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  disableCache(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  let userKey = '';
  try {
    userKey = getSessionUserKey(requireUserSession(req));
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const feedbackId = parseFeedbackId(req.query.id);
  if (!feedbackId) {
    return res.status(400).json({ error: 'Invalid feedback id' });
  }

  const rawValue = Number(req.body?.value);
  const value = rawValue > 0 ? 1 : rawValue < 0 ? -1 : 0;

  const existingRequest = await prisma.feedbackRequest.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });
  if (!existingRequest) {
    return res.status(404).json({ error: 'Feedback request not found' });
  }

  if (value === 0) {
    await prisma.feedbackVote.deleteMany({ where: { feedbackId, userKey } });
    return res.status(200).json({ success: true, userVote: 0 });
  }

  await prisma.feedbackVote.upsert({
    where: { feedbackId_userKey: { feedbackId, userKey } },
    create: { feedbackId, userKey, value },
    update: { value },
  });

  return res.status(200).json({ success: true, userVote: value });
}
