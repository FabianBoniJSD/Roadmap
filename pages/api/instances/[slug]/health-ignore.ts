import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { extractAdminSession } from '@/utils/apiAuth';
import { clientDataService } from '@/utils/clientDataService';
import {
  mapInstanceRecord,
  toInstanceSummary,
  type PrismaInstanceWithHosts,
} from '@/utils/instanceConfig';

type IgnoreOp = 'ignore' | 'unignore';
type IgnoreKind = 'missing' | 'unexpected' | 'typeMismatch';

type IgnoreItem = {
  kind: IgnoreKind;
  listName: string;
  field: string;
  expected?: string;
  actual?: string;
};

const sanitizeSlug = (value: string) => value.trim().toLowerCase();

const decodeSettings = (settingsJson: string | null): Record<string, unknown> => {
  if (!settingsJson) return {};
  try {
    const parsed = JSON.parse(settingsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // ignore parse errors
  }
  return {};
};

const ensureRecordObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  return {};
};

const typeMismatchKey = (field: string, expected: string, actual: string) =>
  `${field}::${expected}::${actual}`;

const upsertString = (arr: string[], value: string, op: IgnoreOp): string[] => {
  const normalized = value.trim();
  if (!normalized) return arr;
  const set = new Set(arr.map((v) => v.trim()).filter(Boolean));
  if (op === 'ignore') set.add(normalized);
  if (op === 'unignore') set.delete(normalized);
  return Array.from(set);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug;
  const slug =
    typeof slugParam === 'string'
      ? sanitizeSlug(slugParam)
      : Array.isArray(slugParam) && slugParam.length > 0
        ? sanitizeSlug(slugParam[0])
        : null;

  if (!slug) return res.status(400).json({ error: 'Invalid slug' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = extractAdminSession(req);

  const record = (await prisma.roadmapInstance.findUnique({
    where: { slug },
    include: { hosts: true },
  })) as PrismaInstanceWithHosts | null;

  if (!record) return res.status(404).json({ error: 'Instance not found' });

  const ensureAdminForInstance = async () => {
    if (session?.isAdmin) return true;
    try {
      const mapped = mapInstanceRecord(record);
      return await clientDataService.withInstance(mapped.slug, () =>
        clientDataService.isCurrentUserAdmin()
      );
    } catch {
      return false;
    }
  };

  if (!(await ensureAdminForInstance())) return res.status(401).json({ error: 'Unauthorized' });

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const op: IgnoreOp = rawBody.op === 'unignore' ? 'unignore' : 'ignore';

  const items: IgnoreItem[] = [];
  if (Array.isArray(rawBody.items)) {
    for (const entry of rawBody.items) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const obj = entry as Record<string, unknown>;
      const kind = obj.kind;
      const listName = typeof obj.listName === 'string' ? obj.listName.trim() : '';
      const field = typeof obj.field === 'string' ? obj.field.trim() : '';
      const expected = typeof obj.expected === 'string' ? obj.expected.trim() : undefined;
      const actual = typeof obj.actual === 'string' ? obj.actual.trim() : undefined;
      if (kind !== 'missing' && kind !== 'unexpected' && kind !== 'typeMismatch') continue;
      if (!listName || !field) continue;
      if (kind === 'typeMismatch' && (!expected || !actual)) continue;
      items.push({ kind, listName, field, expected, actual });
    }
  } else {
    // Backward compatible single-item payload
    const kind = rawBody.kind;
    const listName = typeof rawBody.listName === 'string' ? rawBody.listName.trim() : '';
    const field = typeof rawBody.field === 'string' ? rawBody.field.trim() : '';
    const expected = typeof rawBody.expected === 'string' ? rawBody.expected.trim() : undefined;
    const actual = typeof rawBody.actual === 'string' ? rawBody.actual.trim() : undefined;
    if (kind !== 'missing' && kind !== 'unexpected' && kind !== 'typeMismatch') {
      return res.status(400).json({ error: 'Invalid kind' });
    }
    if (!listName) return res.status(400).json({ error: 'Invalid listName' });
    if (!field) return res.status(400).json({ error: 'Invalid field' });
    if (kind === 'typeMismatch' && (!expected || !actual)) {
      return res.status(400).json({ error: 'expected/actual required for typeMismatch' });
    }
    items.push({ kind, listName, field, expected, actual });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'No valid items provided' });
  }

  const settings = decodeSettings(record.settingsJson ?? null);
  const metadata = ensureRecordObject(settings.metadata);

  const spHealthIgnore = ensureRecordObject(metadata.spHealthIgnore);
  const schemaMismatches = ensureRecordObject(spHealthIgnore.schemaMismatches);

  for (const item of items) {
    const listIgnore = ensureRecordObject(schemaMismatches[item.listName]);
    if (item.kind === 'missing') {
      listIgnore.missing = upsertString(
        Array.isArray(listIgnore.missing) ? (listIgnore.missing as string[]) : [],
        item.field,
        op
      );
    } else if (item.kind === 'unexpected') {
      listIgnore.unexpected = upsertString(
        Array.isArray(listIgnore.unexpected) ? (listIgnore.unexpected as string[]) : [],
        item.field,
        op
      );
    } else {
      const key = typeMismatchKey(item.field, item.expected ?? '', item.actual ?? '');
      listIgnore.typeMismatches = upsertString(
        Array.isArray(listIgnore.typeMismatches) ? (listIgnore.typeMismatches as string[]) : [],
        key,
        op
      );
    }
    schemaMismatches[item.listName] = listIgnore;
  }

  spHealthIgnore.schemaMismatches = schemaMismatches;
  metadata.spHealthIgnore = spHealthIgnore;
  settings.metadata = metadata;

  const updated = (await prisma.roadmapInstance.update({
    where: { id: record.id },
    data: { settingsJson: JSON.stringify(settings) },
    include: { hosts: true },
  })) as PrismaInstanceWithHosts;

  return res.status(200).json({ instance: toInstanceSummary(mapInstanceRecord(updated)) });
}
