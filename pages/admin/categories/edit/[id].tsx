import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import CategoryForm from '../../../../components/CategoryForm';
import { clientDataService } from '@/utils/clientDataService';
import withAdminAuth from '@/components/withAdminAuth';
import { Category } from '@/types';

const EditCategoryPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  // Use useCallback to memoize the fetchCategory function
  const fetchCategory = useCallback(async (categoryId: string) => {
    try {
      setLoading(true);
      // Use clientDataService directly
      const data = await clientDataService.getCategoryById(categoryId);
      if (data) {
        setCategory(data);
      } else {
        console.error('Category not found');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      console.error('Failed to load category');
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchCategory(id);
    }
  }, [id, fetchCategory]);

  const handleCancel = () => {
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Category</h1>
        {category && (
          <CategoryForm
            category={category}  // Use "category" instead of "initialData"
            onSave={() => router.push('/admin')}  // Add the onSave pro
            onCancel={handleCancel}
          />
        )}

      </div>
    </div>
  );
};

export default withAdminAuth(EditCategoryPage);