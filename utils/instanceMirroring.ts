import prisma from '@/lib/prisma';
import type { Category, InstanceBadgeOption, Project } from '@/types';
import type { RoadmapInstanceConfig } from '@/types/roadmapInstance';
import { clientDataService } from '@/utils/clientDataService';
import { mapInstanceRecord, type PrismaInstanceWithHosts } from '@/utils/instanceConfig';
import { isSampleDataInstance, getSampleProjects } from '@/utils/sampleInstanceData';

type ForwardedRequestHeaders = { authorization?: string; cookie?: string };

type MirroredProjectsResult = {
  mirroredProjects: Project[];
  mirroredCategories: Category[];
  badgeOptions: InstanceBadgeOption[];
};

const MIRROR_PROJECT_PREFIX = 'mirror:';
const MIRROR_CATEGORY_PREFIX = 'instance:';
const DEFAULT_MIRROR_CATEGORY_COLOR = '#475569';
const DEFAULT_MIRROR_CATEGORY_ICON = 'FiLayers';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeInstanceBadge = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getInstanceBadge = (
  instanceOrMetadata:
    | Pick<RoadmapInstanceConfig, 'metadata'>
    | Record<string, unknown>
    | null
    | undefined
): string | null => {
  const source =
    instanceOrMetadata && 'metadata' in instanceOrMetadata
      ? asRecord(instanceOrMetadata.metadata)
      : asRecord(instanceOrMetadata);
  if (!source) return null;

  const badges = [source.instanceBadge, source.badge, asRecord(source.mirroring)?.badge];

  for (const candidate of badges) {
    const normalized = normalizeInstanceBadge(candidate);
    if (normalized) return normalized;
  }

  return null;
};

export const setInstanceBadgeMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  badge: string | null
): Record<string, unknown> => {
  const next = asRecord(metadata) ? { ...(metadata as Record<string, unknown>) } : {};
  const normalized = normalizeInstanceBadge(badge);
  if (normalized) {
    next.instanceBadge = normalized;
  } else {
    delete next.instanceBadge;
  }
  return next;
};

export const buildMirroredProjectId = (sourceSlug: string, sourceProjectId: string): string =>
  `${MIRROR_PROJECT_PREFIX}${encodeURIComponent(sourceSlug)}:${encodeURIComponent(sourceProjectId)}`;

export const parseMirroredProjectId = (
  value: string | null | undefined
): { sourceSlug: string; sourceProjectId: string } | null => {
  if (!value || !value.startsWith(MIRROR_PROJECT_PREFIX)) return null;
  const payload = value.slice(MIRROR_PROJECT_PREFIX.length);
  const separatorIndex = payload.indexOf(':');
  if (separatorIndex <= 0) return null;

  try {
    const sourceSlug = decodeURIComponent(payload.slice(0, separatorIndex)).trim().toLowerCase();
    const sourceProjectId = decodeURIComponent(payload.slice(separatorIndex + 1)).trim();
    if (!sourceSlug || !sourceProjectId) return null;
    return { sourceSlug, sourceProjectId };
  } catch {
    return null;
  }
};

export const buildMirrorCategoryId = (sourceSlug: string): string =>
  `${MIRROR_CATEGORY_PREFIX}${String(sourceSlug || '')
    .trim()
    .toLowerCase()}`;

const buildMirrorCategory = (
  instance: Pick<RoadmapInstanceConfig, 'slug' | 'displayName'>
): Category => ({
  id: buildMirrorCategoryId(instance.slug),
  name: instance.displayName,
  color: DEFAULT_MIRROR_CATEGORY_COLOR,
  icon: DEFAULT_MIRROR_CATEGORY_ICON,
});

const normalizeBadgeList = (badges: unknown): string[] => {
  if (!Array.isArray(badges)) return [];
  return badges
    .map((badge) => normalizeInstanceBadge(badge))
    .filter((badge): badge is string => Boolean(badge));
};

const mapMirroredProject = (
  project: Project,
  sourceInstance: Pick<RoadmapInstanceConfig, 'slug' | 'displayName'>
): Project => ({
  ...project,
  id: buildMirroredProjectId(sourceInstance.slug, project.id),
  sourceProjectId: project.id,
  category: buildMirrorCategoryId(sourceInstance.slug),
  categoryLabel: sourceInstance.displayName,
  isReadOnlyMirror: true,
  mirrorSourceInstanceSlug: sourceInstance.slug,
  mirrorSourceInstanceName: sourceInstance.displayName,
});

const loadProjectsForInstance = async (
  instance: RoadmapInstanceConfig,
  forwardedHeaders?: ForwardedRequestHeaders
): Promise<Project[]> => {
  if (isSampleDataInstance(instance)) {
    return getSampleProjects();
  }

  return clientDataService.withRequestHeaders(forwardedHeaders, () =>
    clientDataService.withInstance(instance.slug, () => clientDataService.getAllProjects())
  );
};

export async function getInstanceBadgeOptions(): Promise<InstanceBadgeOption[]> {
  const records = (await prisma.roadmapInstance.findMany({
    include: { hosts: true },
    orderBy: { slug: 'asc' },
  })) as PrismaInstanceWithHosts[];

  return records
    .map((record) => mapInstanceRecord(record))
    .map((instance) => ({
      slug: instance.slug,
      displayName: instance.displayName,
      badge: getInstanceBadge(instance),
    }))
    .filter((entry): entry is InstanceBadgeOption => Boolean(entry.badge));
}

export async function getMirroredProjectsForInstance(opts: {
  instance: RoadmapInstanceConfig;
  forwardedHeaders?: ForwardedRequestHeaders;
}): Promise<MirroredProjectsResult> {
  const targetBadge = getInstanceBadge(opts.instance);
  const badgeOptions = await getInstanceBadgeOptions();

  if (!targetBadge) {
    return { mirroredProjects: [], mirroredCategories: [], badgeOptions };
  }

  const records = (await prisma.roadmapInstance.findMany({
    include: { hosts: true },
    orderBy: { slug: 'asc' },
  })) as PrismaInstanceWithHosts[];

  const sourceInstances = records
    .map((record) => mapInstanceRecord(record))
    .filter((candidate) => candidate.slug !== opts.instance.slug);

  const mirroredBySource = await Promise.all(
    sourceInstances.map(async (sourceInstance) => {
      try {
        const projects = await loadProjectsForInstance(sourceInstance, opts.forwardedHeaders);
        const mirroredProjects = projects
          .filter((project) =>
            normalizeBadgeList(project.badges).some(
              (badge) => badge.toLowerCase() === targetBadge.toLowerCase()
            )
          )
          .map((project) => mapMirroredProject(project, sourceInstance));

        return mirroredProjects.length > 0
          ? {
              sourceInstance,
              mirroredProjects,
            }
          : null;
      } catch (error) {
        console.warn('[instanceMirroring] failed to load mirrored projects', {
          sourceSlug: sourceInstance.slug,
          targetSlug: opts.instance.slug,
          error,
        });
        return null;
      }
    })
  );

  const mirroredProjects = mirroredBySource.flatMap((entry) => entry?.mirroredProjects ?? []);
  const mirroredCategories = mirroredBySource
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => buildMirrorCategory(entry.sourceInstance));

  return { mirroredProjects, mirroredCategories, badgeOptions };
}

export async function getMirroredProjectById(opts: {
  targetInstance: RoadmapInstanceConfig;
  mirroredId: string;
  forwardedHeaders?: ForwardedRequestHeaders;
}): Promise<Project | null> {
  const parsed = parseMirroredProjectId(opts.mirroredId);
  const targetBadge = getInstanceBadge(opts.targetInstance);
  if (!parsed || !targetBadge) return null;

  const sourceRecord = await prisma.roadmapInstance.findUnique({
    where: { slug: parsed.sourceSlug },
    include: { hosts: true },
  });
  if (!sourceRecord) return null;

  const sourceInstance = mapInstanceRecord(sourceRecord as PrismaInstanceWithHosts);
  const sourceProject = isSampleDataInstance(sourceInstance)
    ? getSampleProjects().find((project) => project.id === parsed.sourceProjectId) || null
    : await clientDataService.withRequestHeaders(opts.forwardedHeaders, () =>
        clientDataService.withInstance(sourceInstance.slug, () =>
          clientDataService.getProjectById(parsed.sourceProjectId)
        )
      );

  if (!sourceProject) return null;

  const hasTargetBadge = normalizeBadgeList(sourceProject.badges).some(
    (badge) => badge.toLowerCase() === targetBadge.toLowerCase()
  );
  if (!hasTargetBadge) return null;

  return mapMirroredProject(sourceProject, sourceInstance);
}
