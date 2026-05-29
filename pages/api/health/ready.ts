import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  return res.status(200).json({ ok: true });
}
