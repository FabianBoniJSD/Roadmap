import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireUserSession } from '@/utils/apiAuth';

type FeedbackVoteValue = -1 | 0 | 1;

type FeedbackItem = {
  id: number;
  title: string;
  description: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  upVotes: number;
  downVotes: number;
  score: number;
  userVote: FeedbackVoteValue;
};

type ApiResponse = { items: FeedbackItem[] } | { item: FeedbackItem } | { error: string };

const disableCache = (res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

const normalizeUserKey = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const getSessionUser = (session: ReturnType<typeof requireUserSession>) => {
  const entra = session.entra && typeof session.entra === 'object' ? session.entra : null;
  const userKey =
    normalizeUserKey(entra?.upn) ||
    normalizeUserKey(entra?.mail) ||
    normalizeUserKey(session.username) ||
    normalizeUserKey(session.displayName);

  const displayName =
    (typeof session.displayName === 'string' && session.displayName.trim()) ||
    (typeof session.username === 'string' && session.username.trim()) ||
    userKey;

  return { userKey, displayName };
};

const mapFeedbackItem = (
  item: Awaited<ReturnType<typeof prisma.feedbackRequest.findMany>>[number] & {
    votes: Array<{ userKey: string; value: number }>;
  },
  userKey: string
): FeedbackItem => {
  const upVotes = item.votes.filter((vote) => vote.value > 0).length;
  const downVotes = item.votes.filter((vote) => vote.value < 0).length;
  const ownVote = item.votes.find((vote) => vote.userKey === userKey)?.value || 0;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    createdByName: item.createdByName,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    upVotes,
    downVotes,
    score: upVotes - downVotes,
    userVote: ownVote > 0 ? 1 : ownVote < 0 ? -1 : 0,
  };
};

const loadFeedbackItems = async (userKey: string): Promise<FeedbackItem[]> => {
  const items = await prisma.feedbackRequest.findMany({
    include: { votes: { select: { userKey: true, value: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return items.map((item) => mapFeedbackItem(item, userKey));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  disableCache(res);

  let userKey = '';
  let displayName = '';
  try {
    const session = requireUserSession(req);
    const user = getSessionUser(session);
    userKey = user.userKey;
    displayName = user.displayName;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const items = await loadFeedbackItems(userKey);
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description =
      typeof req.body?.description === 'string' && req.body.description.trim()
        ? req.body.description.trim()
        : null;

    if (title.length < 4 || title.length > 120) {
      return res.status(400).json({ error: 'Titel muss zwischen 4 und 120 Zeichen lang sein.' });
    }
    if (description && description.length > 1200) {
      return res.status(400).json({ error: 'Beschreibung darf maximal 1200 Zeichen lang sein.' });
    }

    const item = await prisma.feedbackRequest.create({
      data: {
        title,
        description,
        createdBy: userKey,
        createdByName: displayName || userKey,
      },
      include: { votes: { select: { userKey: true, value: true } } },
    });

    return res.status(201).json({ item: mapFeedbackItem(item, userKey) });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
