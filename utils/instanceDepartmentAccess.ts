import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const normalize = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/[\u00A0\t\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
    : '';

const toLooseDepartmentKey = (value: unknown): string =>
  normalize(value)
    .replace(/[&+]/g, ' und ')
    .replace(/[\\/|]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

export const normalizeDepartment = normalize;

export const parseDepartmentsPayload = (value: unknown): string[] => {
  const rawValues: string[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') rawValues.push(entry);
    }
  } else if (typeof value === 'string') {
    rawValues.push(...value.split(/[\n,;]/));
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawValues) {
    const trimmed = raw.trim();
    const normalized = normalize(trimmed);
    if (!trimmed || !normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(trimmed);
  }

  return out;
};

export async function getAllowedDepartmentsForInstanceSlugs(
  slugs: string[]
): Promise<Record<string, string[]>> {
  const normalizedSlugs = Array.from(new Set(slugs.map((s) => normalize(s)).filter(Boolean)));
  if (normalizedSlugs.length === 0) return {};

  try {
    const rows = await prisma.$queryRaw<
      Array<{ instanceSlug: string; department: string }>
    >(Prisma.sql`
      SELECT "instanceSlug", "department"
      FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" IN (${Prisma.join(normalizedSlugs)})
      ORDER BY "instanceSlug" ASC, "normalizedDepartment" ASC
    `);

    const out: Record<string, string[]> = {};
    for (const row of rows) {
      const slug = normalize(row.instanceSlug);
      if (!slug) continue;
      if (!out[slug]) out[slug] = [];
      out[slug].push(String(row.department || '').trim());
    }
    return out;
  } catch {
    return {};
  }
}

export async function isDepartmentAllowedForInstance(opts: {
  instanceSlug: string;
  department: string;
}): Promise<boolean> {
  const instanceSlug = normalize(opts.instanceSlug);
  const department = normalize(opts.department);
  const looseDepartment = toLooseDepartmentKey(opts.department);
  if (!instanceSlug || !department) return false;

  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: number; department: string; normalizedDepartment: string }>
    >(Prisma.sql`
      SELECT "id", "department", "normalizedDepartment"
      FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" = ${instanceSlug}
    `);

    return rows.some((row) => {
      const normalizedCandidate = normalize(row.normalizedDepartment || row.department || '');
      if (!normalizedCandidate) return false;
      if (normalizedCandidate === department) return true;

      const looseCandidate = toLooseDepartmentKey(row.department || row.normalizedDepartment);
      if (!looseCandidate || !looseDepartment) return false;
      if (looseCandidate === looseDepartment) return true;
      if (looseCandidate.includes(looseDepartment) || looseDepartment.includes(looseCandidate)) {
        return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

export async function replaceAllowedDepartmentsForInstance(opts: {
  instanceSlug: string;
  departments: string[];
}): Promise<void> {
  const instanceSlug = normalize(opts.instanceSlug);
  if (!instanceSlug) return;

  const departments = parseDepartmentsPayload(opts.departments).map((d) => ({
    department: d,
    normalizedDepartment: normalize(d),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" = ${instanceSlug}
    `);

    for (const entry of departments) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "InstanceDepartmentAccess" (
          "instanceSlug",
          "department",
          "normalizedDepartment",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${instanceSlug},
          ${entry.department},
          ${entry.normalizedDepartment},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);
    }
  });
}

export async function deleteDepartmentAccessForInstance(instanceSlug: string): Promise<void> {
  const normalizedSlug = normalize(instanceSlug);
  if (!normalizedSlug) return;
  try {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" = ${normalizedSlug}
    `);
  } catch {
    // ignore cleanup errors
  }
}
