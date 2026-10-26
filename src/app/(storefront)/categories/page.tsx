import type { Metadata } from "next";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

export default function CategoriesPage() {
  return <CategoriesPageContent />;
}
