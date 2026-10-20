import type { Metadata } from "next";
import { BackButton } from "@/components/navigation/BackButton";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Yaadro products.",
};

export default function WishlistPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 pt-1">
        {/* Variant: leaf */}
        <BackButton href="/home" variant="leaf" />
        <span className="text-xs font-medium text-muted">Back · Leaf</span>
      </div>
      <p className="mt-6 text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
        Wishlist
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        Coming soon
      </h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">
        Saved products will appear here.
      </p>
    </main>
  );
}
