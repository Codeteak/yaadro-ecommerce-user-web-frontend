import type { Metadata } from "next";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

export default function CategoriesPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader backHref="/home" />
      <PullToRefresh>
        <p className="mt-6 text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
          Categories
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Coming soon
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          Category browsing will live here next.
        </p>
      </PullToRefresh>
    </main>
  );
}
