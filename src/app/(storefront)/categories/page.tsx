import type { Metadata } from "next";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
import { loadCategoryBrowser } from "@/lib/api/storefront";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

type CategoriesPageProps = {
  searchParams: Promise<{ cat?: string; focus?: string; chips?: string }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const query = await searchParams;
  const catalog = await loadCategoryBrowser(query.cat);

  return (
    <CategoriesPageContent
      branches={catalog.branches}
      products={catalog.products}
      error={catalog.error}
      selection={catalog.selectedKey}
      focusSearch={query.focus === "search"}
      initialChipsOpen={query.chips === "1"}
    />
  );
}
