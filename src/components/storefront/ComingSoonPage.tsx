import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

type ComingSoonPageProps = {
  title: string;
  description: string;
  backHref?: string;
};

/** Shared placeholder for storefront sections whose APIs are not wired yet. */
export function ComingSoonPage({
  title,
  description,
  backHref = "/profile",
}: ComingSoonPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader backHref={backHref} title={title} />

      <PullToRefresh className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
            Coming soon
          </p>
          <p className="mt-3 max-w-xs text-[15px] leading-6 text-muted">
            {description}
          </p>
        </section>
      </PullToRefresh>
    </main>
  );
}
