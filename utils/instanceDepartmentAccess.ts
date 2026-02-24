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

const isDepartmentLikeMatch = (left: string, right: string): boolean => {
  const l = toLooseDepartmentKey(left);
  const r = toLooseDepartmentKey(right);
  if (!l || !r) return false;
  if (l === r) return true;
  return l.includes(r) || r.includes(l);
};

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

      return isDepartmentLikeMatch(row.department || row.normalizedDepartment, looseDepartment);
    });
  } catch {
    return false;
  }
}

export async function isAnyDepartmentCandidateAllowedForInstance(opts: {
  instanceSlug: string;
  candidates: string[];
}): Promise<boolean> {
  const instanceSlug = normalize(opts.instanceSlug);
  const candidates = Array.from(new Set(opts.candidates.map((c) => normalize(c)).filter(Boolean)));
  if (!instanceSlug || candidates.length === 0) return false;

  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: number; department: string; normalizedDepartment: string }>
    >(Prisma.sql`
      SELECT "id", "department", "normalizedDepartment"
      FROM "InstanceDepartmentAccess"
      WHERE "instanceSlug" = ${instanceSlug}
    `);

    if (rows.length > 0) {
      return rows.some((row) => {
        const normalizedCandidate = normalize(row.normalizedDepartment || row.department || '');
        if (!normalizedCandidate) return false;

        if (candidates.includes(normalizedCandidate)) return true;

        return candidates.some((sourceCandidate) =>
          isDepartmentLikeMatch(row.department || row.normalizedDepartment, sourceCandidate)
        );
      });
    }

    const instanceRows = await prisma.$queryRaw<Array<{ department: string | null }>>(Prisma.sql`
      SELECT "department"
      FROM "RoadmapInstance"
      WHERE "slug" = ${instanceSlug}
      LIMIT 1
    `);

    if (instanceRows.length === 0) return false;
    const fallbackDepartment = String(instanceRows[0]?.department || '').trim();
    if (!fallbackDepartment) return false;

    const normalizedFallback = normalize(fallbackDepartment);
    if (normalizedFallback && candidates.includes(normalizedFallback)) return true;

    return candidates.some((sourceCandidate) =>
      isDepartmentLikeMatch(fallbackDepartment, sourceCandidate)
    );
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
