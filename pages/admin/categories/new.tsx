import { useRouter } from 'next/router';
import { type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import CategoryForm from '@/components/CategoryForm';
import withAdminAuth from '@/components/withAdminAuth';
import { buildInstanceAwareUrl } from '@/utils/auth';
import type { Category } from '@/types';

const NewCategoryPage: FC = () => {
  const router = useRouter();

  const handleCancel = () => {
    router.push({ pathname: '/admin', query: router.query });
  };

  const handleSave = async (categoryData: Omit<Category, 'id'>) => {
    const response = await fetch(buildInstanceAwareUrl('/api/categories'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Kategorie konnte nicht gespeichert werden.');
    }

    router.push({ pathname: '/admin', query: router.query });
  };

  return (
    <AdminSubpageLayout
      title="Neue Kategorie anlegen"
      description="Strukturieren Sie die Roadmap, indem Sie Themenbereiche mit eindeutigen Farben und Icons versehen."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Kategorien' }, { label: 'Neu' }]}
    >
      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-lg shadow-slate-950/40 sm:px-9">
        <CategoryForm onSave={handleSave} onCancel={handleCancel} />
      </section>
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(NewCategoryPage);
