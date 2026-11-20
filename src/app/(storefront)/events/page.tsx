import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { getHomeSection } from "@/lib/api/storefront";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Event",
  description: "A Yaadro shop event and the products in it.",
};

type EventsPageProps = {
  searchParams: Promise<{ id?: string }>;
};

function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dateRange(startsAt: string | null, endsAt: string | null): string | null {
  const start = startsAt ? dateLabel(startsAt) : "";
  const end = endsAt ? dateLabel(endsAt) : "";
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return null;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { id } = await searchParams;
  const shopId = await getRequestShopId();
  const section = id ? await getHomeSection(shopId, id) : null;
  const range = section ? dateRange(section.startsAt, section.endsAt) : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref="/home" title={section?.title ?? "Event"} />
      {section ? (
        <>
          {range ? (
            <p className="pb-4 text-center text-[13px] font-semibold text-forest">{range}</p>
          ) : null}
          {section.products.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-muted">
              This event has no products right now.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 pb-8">
              {section.products.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <h2 className="text-xl font-extrabold text-ink">This event is not available</h2>
          <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
            It may have ended, or the link is missing an event.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black"
          >
            Back home
          </Link>
        </div>
      )}
    </main>
  );
}
