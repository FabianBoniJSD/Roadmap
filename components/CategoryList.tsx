import React from 'react';
import Link from 'next/link';
import { Category } from '../types';

interface CategoryListProps {
  categories: Category[];
  onDelete: (id: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onDelete }) => {
  // Separate top-level categories and subcategories
  const topLevelCategories = categories.filter((cat) => !cat.parentId);

  // Create a map of parent IDs to their subcategories
  const subcategoriesByParent: Record<string, Category[]> = {};
  categories
    .filter((cat) => cat.parentId)
    .forEach((subcat) => {
      if (!subcategoriesByParent[subcat.parentId!]) {
        subcategoriesByParent[subcat.parentId!] = [];
      }
      subcategoriesByParent[subcat.parentId!].push(subcat);
    });

  // Helper function to render a category item with its subcategories
  const renderCategoryItem = (category: Category, level: number = 0) => {
    const subcategories = subcategoriesByParent[category.id] || [];

    return (
      <React.Fragment key={category.id}>
        <tr className="border-b border-gray-700">
          <td className="py-3 px-4">
            <div className="flex items-center">
              {level > 0 && <span className="ml-4 mr-2 text-gray-500">↳</span>}
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              ></div>
              <span className={level > 0 ? 'text-sm' : 'font-medium'}>{category.name}</span>
              {level > 0 && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-700 rounded-full">Subcategory</span>
              )}
            </div>
          </td>
          <td className="py-3 px-4 text-right">
            <Link href={`/admin/categories/edit/${category.id}`}>
              <button className="text-blue-400 hover:text-blue-300 mr-3">Edit</button>
            </Link>
            {/* Only allow deletion if there are no subcategories */}
            {(!subcategories || subcategories.length === 0) && (
              <button
                onClick={() => onDelete(category.id)}
                className="text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            )}
          </td>
        </tr>
        {subcategories.map((subcat) => renderCategoryItem(subcat, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 normal-case tracking-normal">
              Category
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-400 normal-case tracking-normal">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {topLevelCategories.map((category) => renderCategoryItem(category))}
          {topLevelCategories.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 px-4 text-center text-gray-400">
                No categories found. Create your first category to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryList;
