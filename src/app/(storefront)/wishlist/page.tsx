import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Yaadro products.",
};

/**
 * Wishlist is still UI-only (hearts on ProductCard are local). Until a
 * wishlist API + persistence land, this page shows the empty state.
 */
export default function WishlistPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader backHref="/home" title="Wishlist" />

      <PullToRefresh className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <Image
            src="/wishlist/empty-wishlist.png"
            alt=""
            width={1310}
            height={1200}
            className="h-auto w-52 max-w-full"
            priority
          />
          <h2 className="mt-5 text-xl font-extrabold text-ink">
            Your wishlist is empty
          </h2>
          <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
            Tap the heart on a product to save it here for later.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Shop now
          </Link>
        </div>
      </PullToRefresh>
    </main>
  );
}
