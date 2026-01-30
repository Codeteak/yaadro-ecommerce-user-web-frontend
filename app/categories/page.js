'use client';

import { useCategoriesTree } from '../../hooks/useProducts';
import Container from '../../components/Container';
import CategoryTreeItem from '../../components/CategoryTreeItem';
import Link from 'next/link';

export default function CategoriesPage() {
  const { data: categoryTree = [], isLoading } = useCategoriesTree();
  const rootCategories = (categoryTree || []).filter(
    (cat) => cat.isActive && (cat.level === 0 || cat.parentId == null)
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden py-16">
        <Container>
          <div className="text-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Loading categories...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
      <Container>
        <div className="py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 px-4 md:px-0">Categories</h1>
          <p className="text-gray-600 mb-6 px-4 md:px-0">Browse by category. Expand to see subcategories.</p>
          <div className="px-4 md:px-0">
            {rootCategories.length === 0 ? (
              <p className="text-gray-500 py-8">No categories yet.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {rootCategories.map((category) => (
                  <CategoryTreeItem key={category.id} category={category} depth={0} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-8 px-4 md:px-0">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold"
            >
              View all products
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
