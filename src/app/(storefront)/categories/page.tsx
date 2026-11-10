import type { Metadata } from "next";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
import { loadHomeCatalog } from "@/lib/api/storefront";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

export default async function CategoriesPage() {
  const catalog = await loadHomeCatalog();

  return (
    <CategoriesPageContent
      branches={catalog.ok ? catalog.branches : []}
      products={catalog.ok ? catalog.products : []}
      error={catalog.error}
    />
  );
}
