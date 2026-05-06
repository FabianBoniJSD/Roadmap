import { useRouter } from 'next/router';
import { useEffect, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import ProjectForm from '@/components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { Category, InstanceBadgeOption, Project } from '@/types';
import { buildInstanceAwareUrl } from '@/utils/auth';

const NewProjectPage: FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [instanceBadgeOptions, setInstanceBadgeOptions] = useState<InstanceBadgeOption[]>([]);
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
        setInstanceBadgeOptions(
          Array.isArray(instancesPayload?.instances)
            ? instancesPayload.instances.filter(
                (instance): instance is InstanceBadgeOption =>
                  typeof instance?.slug === 'string' &&
                  typeof instance?.displayName === 'string' &&
                  typeof instance?.badge === 'string' &&
                  instance.badge.trim().length > 0
              )
            : []
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

      router.push({ pathname: '/admin', query: router.query });
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Projekt konnte nicht gespeichert werden. Bitte prüfen Sie die Eingaben.');
    }
  };

  return (
    <AdminSubpageLayout
      title="Neues Projekt erstellen"
      description="Legen Sie ein Projekt mit allen relevanten Informationen an. Pflichtfelder sind markiert, weitere Angaben können später ergänzt werden."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Projekte' }, { label: 'Neu' }]}
    >
      {loading ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-16 shadow-lg shadow-slate-950/30">
          <JSDoITLoader message="Kategorien werden geladen …" />
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
          <ProjectForm
            categories={categories}
            instanceBadgeOptions={instanceBadgeOptions}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </section>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(NewProjectPage);
