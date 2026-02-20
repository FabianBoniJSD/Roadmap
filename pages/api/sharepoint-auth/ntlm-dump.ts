import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'gone',
    detail: 'Legacy auth diagnostics have been removed.',
  });
}
