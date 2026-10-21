import { useRouter } from 'next/router';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { useEffect, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import ProjectForm from '@/components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { Category, InstanceBadgeOption, Project } from '@/types';
import { buildInstanceAwareUrl } from '@/utils/auth';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import { buildProjectSaveNoticeQuery, countUniqueMirrorTargets } from '@/utils/projectSaveNotice';

const NewProjectPage: FC = () => {
  const router = useRouter();
  const instanceQuery = router.query?.[INSTANCE_QUERY_PARAM];
  const instanceSlug = Array.isArray(instanceQuery) ? instanceQuery[0] : instanceQuery || null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [instanceBadgeOptions, setInstanceBadgeOptions] = useState<InstanceBadgeOption[]>([]);
  const [instanceBadgeOptionsError, setInstanceBadgeOptionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const [categoriesResponse, instancesResponse] = await Promise.all([
          fetch(buildInstanceAwareUrl('/api/categories'), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          }),
          fetch('/api/instances/slugs', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          }),
        ]);
        if (!categoriesResponse.ok) {
          const payload = await categoriesResponse.json().catch(() => null);
          throw new Error(payload?.error || 'Kategorien konnten nicht geladen werden');
        }
        const categoriesData = (await categoriesResponse.json()) as Category[];
        const instancesPayload = await instancesResponse.json().catch(() => null);
        if (cancelled) return;
        setCategories(categoriesData);
        const accessibleInstanceSlugs = new Set<string>(
          Array.isArray(instancesPayload?.instances)
            ? instancesPayload.instances
                .map((instance: unknown) =>
                  instance && typeof instance === 'object' && 'slug' in instance
                    ? String(instance.slug).trim().toLowerCase()
                    : ''
                )
                .filter(Boolean)
            : []
        );
        const validBadgeOptions = Array.isArray(instancesPayload?.badgeOptions)
          ? instancesPayload.badgeOptions.filter(
              (instance): instance is InstanceBadgeOption =>
                typeof instance?.slug === 'string' &&
                typeof instance?.displayName === 'string' &&
                typeof instance?.badge === 'string' &&
                instance.badge.trim().length > 0
            )
          : [];
        setInstanceBadgeOptions(
          validBadgeOptions.map((option) => ({
            ...option,
            hasDirectAccess: accessibleInstanceSlugs.has(option.slug.trim().toLowerCase()),
          }))
        );
        setInstanceBadgeOptionsError(
          instancesResponse.ok
            ? null
            : 'Spiegelziele konnten nicht geladen werden. Laden Sie die Seite erneut.'
        );
      } catch (err) {
        console.error('Error fetching categories:', err);
        if (cancelled) return;
        setError('Kategorien konnten nicht geladen werden. Bitte versuchen Sie es erneut.');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    fetchCategories();
    // Refetch when route (instance) changes so the category list stays in sync
    return () => {
      cancelled = true;
    };
  }, [router.asPath]);

  const handleCancel = () => {
    router.push({ pathname: '/admin', query: router.query });
  };

  const handleSubmit = async (project: Project) => {
    try {
      const response = await fetch(buildInstanceAwareUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(project),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Projekt konnte nicht gespeichert werden.');
      }

      const mirrorTargetInstanceSlugs = (
        project as Project & { mirrorTargetInstanceSlugs?: unknown }
      ).mirrorTargetInstanceSlugs;
      await router.push({
        pathname: '/admin',
        query: buildProjectSaveNoticeQuery(router.query, {
          action: 'created',
          publishedCount: countUniqueMirrorTargets(mirrorTargetInstanceSlugs, instanceSlug),
        }),
      });
    } catch (err) {
      console.error('Error saving project:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Projekt konnte nicht gespeichert werden. Bitte prüfen Sie die Eingaben.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      throw err instanceof Error ? err : new Error('Projekt konnte nicht gespeichert werden.');
    }
  };

  return (
    <AdminSubpageLayout
      title="Neues Projekt erstellen"
      description="Legen Sie ein Projekt mit allen relevanten Informationen an. Pflichtfelder sind markiert, weitere Angaben können später ergänzt werden."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Projekte' }, { label: 'Neu' }]}
    >
      {loading ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-16 ">
          <JSDoITLoader message="Kategorien werden geladen …" />
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 sm:px-9">
          {error && (
            <div
              className="mb-6 rounded-2xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <ProjectForm
            categories={categories}
            instanceBadgeOptions={instanceBadgeOptions}
            instanceBadgeOptionsError={instanceBadgeOptionsError}
            instanceSlug={instanceSlug}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </section>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(NewProjectPage);
