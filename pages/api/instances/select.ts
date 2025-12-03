import type { NextApiRequest, NextApiResponse } from 'next';
import { getInstanceConfigBySlug, setInstanceCookieHeader } from '@/utils/instanceConfig';
import { sanitizeSlug } from './helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slugRaw = req.body?.slug;
  if (!slugRaw || typeof slugRaw !== 'string') {
    return res.status(400).json({ error: 'slug is required' });
  }

  const slug = sanitizeSlug(slugRaw);
  const instance = await getInstanceConfigBySlug(slug);
  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  res.setHeader('Set-Cookie', setInstanceCookieHeader(instance.slug));
  return res.status(200).json({
    slug: instance.slug,
    displayName: instance.displayName,
    department: instance.department,
  });
}
