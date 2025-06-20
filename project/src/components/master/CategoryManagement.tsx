import React, { useState } from 'react';
import { Plus, Tag, ChevronRight } from 'lucide-react';
import { useCategories } from '../../hooks/useSupabase';

export default function CategoryManagement() {
  const { categories, subcategories, loading, error, addCategory, addSubcategory } = useCategories();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setSubmitting(true);
    const result = await addCategory(categoryName.trim());
    if (result.success) {
      setCategoryName('');
      setShowCategoryForm(false);
    }
    setSubmitting(false);
  };

  const handleAddSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!subcategoryName.trim()) return;

    setSubmitting(true);
    const result = await addSubcategory(categoryId, subcategoryName.trim());
    if (result.success) {
      setSubcategoryName('');
      setShowSubcategoryForm(null);
    }
    setSubmitting(false);
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {showCategoryForm && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
          
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter category name"
              required
            />
            <button
              type="button"
              onClick={() => {
                setCategoryName('');
                setShowCategoryForm(false);
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Category'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {categories.map((category) => {
          const categorySubcategories = getSubcategoriesForCategory(category.id);
          
          return (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {categorySubcategories.length} subcategories
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setShowSubcategoryForm(
                      showSubcategoryForm === category.id ? null : category.id
                    )}
                    className="flex items-center px-3 py-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Subcategory
                  </button>
                </div>

                {showSubcategoryForm === category.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <form onSubmit={(e) => handleAddSubcategory(e, category.id)} className="flex gap-3">
                      <input
                        type="text"
                        value={subcategoryName}
                        onChange={(e) => setSubcategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter subcategory name"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSubcategoryName('');
                          setShowSubcategoryForm(null);
                        }}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? 'Adding...' : 'Add'}
                      </button>
                    </form>
                  </div>
                )}

                {categorySubcategories.length > 0 && (
                  <div className="mt-4 pl-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categorySubcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className="flex items-center p-2 bg-gray-50 rounded-md"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">{subcategory.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500 mb-4">Create categories to organize your work types.</p>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Category
            </button>
          </div>
        )}
      </div>
    </div>
  );
}