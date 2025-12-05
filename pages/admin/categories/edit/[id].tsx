import { useRouter } from 'next/router';
import { useEffect, useState, type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import CategoryForm from '@/components/CategoryForm';
import JSDoITLoader from '@/components/JSDoITLoader';
import withAdminAuth from '@/components/withAdminAuth';
import { Category } from '@/types';
import { clientDataService } from '@/utils/clientDataService';

const EditCategoryPage: FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!id || typeof id !== 'string') return;

      try {
        setLoading(true);
        setError(null);
        const data = await clientDataService.getCategoryById(id);
        setCategory(data);
      } catch (err) {
        console.error('Error fetching category:', err);
        setError('Kategorie konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  const handleCancel = () => {
    router.push('/admin');
  };

  const handleSave = () => {
    router.push('/admin');
  };

  return (
    <AdminSubpageLayout
      title="Kategorie bearbeiten"
      description="Passen Sie Name, Farbe und Icon an, um die Roadmap übersichtlich zu halten."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kategorien' },
        { label: 'Bearbeiten' },
      ]}
    >
      {loading ? (
        <section className="flex items-center justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-16 shadow-lg shadow-slate-950/30">
          <JSDoITLoader message="Kategorie wird geladen …" />
        </section>
      ) : error || !category ? (
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-12 text-center shadow-lg shadow-slate-950/30">
          <p className="text-sm text-slate-300">
            {error ?? 'Die gewünschte Kategorie wurde nicht gefunden.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="mt-4 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Zurück zum Dashboard
          </button>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
          <CategoryForm category={category} onSave={handleSave} onCancel={handleCancel} />
        </section>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(EditCategoryPage);
