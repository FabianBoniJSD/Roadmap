import type { NextApiRequest, NextApiResponse } from 'next';
import { ORBIT_URL } from '@/utils/orbit';

// Compatibility response only. Never read messages, issue chat cookies or access the database.
export default function retiredSupportChat(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'Der lokale Support-Chat wurde eingestellt.',
    supportUrl: ORBIT_URL,
  });
}
