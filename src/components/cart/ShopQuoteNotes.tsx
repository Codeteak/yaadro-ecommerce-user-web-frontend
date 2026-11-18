import Link from "next/link";
import { formatRupees, type ShopQuote } from "@/lib/cart-checkout-rules";

export function shopDue(quote: ShopQuote | null, phoneTotal: number): string {
  if (quote?.totalRupees == null) return `₹${phoneTotal}`;
  return formatRupees(quote.totalRupees);
}

/** Standing minimum warning and automatic offers from the shop quote. */
export function ShopQuoteNotes({ quote }: { quote: ShopQuote | null }) {
  if (!quote) return null;
  const offers = [...quote.applied, ...quote.suggested];
  if (!quote.minimumMessage && offers.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {quote.minimumMessage ? (
        <p
          role="status"
          className="rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-3 text-[13px] leading-5 font-bold text-amber-950"
        >
          {quote.minimumMessage}
        </p>
      ) : null}
      {offers.map((offer) => {
        const row = (
          <span className="block rounded-xl bg-white px-3.5 py-3 text-[13px] leading-5 ring-1 ring-forest/10">
            <span className="font-bold text-forest">
              {offer.reached ? "Applied" : "Not reached yet"}
            </span>
            <span className="mt-0.5 block font-medium text-muted">{offer.label}</span>
          </span>
        );
        if (!offer.categoryId) {
          return <div key={`${offer.reached}-${offer.label}`}>{row}</div>;
        }
        return (
          <Link
            key={`${offer.reached}-${offer.categoryId}-${offer.label}`}
            href={`/categories?cat=${offer.categoryId}`}
            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            {row}
          </Link>
        );
      })}
    </div>
  );
}
