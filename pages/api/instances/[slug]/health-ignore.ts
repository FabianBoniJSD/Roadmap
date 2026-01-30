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

  const body = req.body as Partial<{
    op: IgnoreOp;
    kind: IgnoreKind;
    listName: string;
    field: string;
    expected: string;
    actual: string;
  }>;

  const op: IgnoreOp = body.op === 'unignore' ? 'unignore' : 'ignore';
  const kind = body.kind;
  const listName = typeof body.listName === 'string' ? body.listName.trim() : '';
  const field = typeof body.field === 'string' ? body.field.trim() : '';

  if (!kind || (kind !== 'missing' && kind !== 'unexpected' && kind !== 'typeMismatch')) {
    return res.status(400).json({ error: 'Invalid kind' });
  }
  if (!listName) return res.status(400).json({ error: 'Invalid listName' });
  if (!field) return res.status(400).json({ error: 'Invalid field' });

  const expected = typeof body.expected === 'string' ? body.expected.trim() : '';
  const actual = typeof body.actual === 'string' ? body.actual.trim() : '';
  if (kind === 'typeMismatch' && (!expected || !actual)) {
    return res.status(400).json({ error: 'expected/actual required for typeMismatch' });
  }

  const settings = decodeSettings(record.settingsJson ?? null);
  const metadata = ensureRecordObject(settings.metadata);

  const spHealthIgnore = ensureRecordObject(metadata.spHealthIgnore);
  const schemaMismatches = ensureRecordObject(spHealthIgnore.schemaMismatches);
  const listIgnore = ensureRecordObject(schemaMismatches[listName]);

  if (kind === 'missing') {
    listIgnore.missing = upsertString(
      Array.isArray(listIgnore.missing) ? (listIgnore.missing as string[]) : [],
      field,
      op
    );
  } else if (kind === 'unexpected') {
    listIgnore.unexpected = upsertString(
      Array.isArray(listIgnore.unexpected) ? (listIgnore.unexpected as string[]) : [],
      field,
      op
    );
  } else {
    const key = typeMismatchKey(field, expected, actual);
    listIgnore.typeMismatches = upsertString(
      Array.isArray(listIgnore.typeMismatches) ? (listIgnore.typeMismatches as string[]) : [],
      key,
      op
    );
  }

  schemaMismatches[listName] = listIgnore;
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
