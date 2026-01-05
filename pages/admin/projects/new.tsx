import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import ProjectForm from '@/components/ProjectForm';
import withAdminAuth from '@/components/withAdminAuth';
import { Category, Project } from '@/types';
import { clientDataService } from '@/utils/clientDataService';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';

const NewProjectPage: FC = () => {
  const router = useRouter();
  const instanceSlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoriesData = await clientDataService.getAllCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Kategorien konnten nicht geladen werden. Bitte versuchen Sie es erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    // Refetch when the active instance changes so the category list stays in sync
  }, [instanceSlug]);

  const handleCancel = () => {
    router.push('/admin');
  };

  const handleSubmit = async (project: Project) => {
    try {
      await clientDataService.saveProject(project);
      router.push('/admin');
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
          <ProjectForm categories={categories} onSubmit={handleSubmit} onCancel={handleCancel} />
        </section>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(NewProjectPage);
