import { useRouter } from 'next/router';
import { type FC } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import CategoryForm from '@/components/CategoryForm';
import withAdminAuth from '@/components/withAdminAuth';

const NewCategoryPage: FC = () => {
  const router = useRouter();

  const handleCancel = () => {
    router.push({ pathname: '/admin', query: router.query });
  };

  const handleSave = () => {
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
