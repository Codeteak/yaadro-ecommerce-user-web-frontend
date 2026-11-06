import type { Metadata } from "next";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
import { loadHomeCatalog } from "@/lib/api/storefront";
import type { CatalogCategory } from "@/lib/catalog-taxonomy";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

export default async function CategoriesPage() {
  const catalog = await loadHomeCatalog();
  const categories: CatalogCategory[] = catalog.categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    image: category.image || "/icons/icon-192.png",
    subcategories: [],
  }));

  return (
    <CategoriesPageContent
      categories={catalog.ok ? categories : []}
      products={catalog.ok ? catalog.products : []}
      error={catalog.error}
    />
  );
}
