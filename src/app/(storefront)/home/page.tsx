import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
  description: "Yaadro storefront — coming soon.",
};

export default function StorefrontHomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
      <div
        className="pointer-events-none absolute -top-20 right-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(47,158,68,0.16),transparent_70%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between pt-2">
          <Image
            src="/onboarding/brand-logo.svg"
            alt="Yaadro"
            width={40}
            height={48}
            unoptimized
            className="h-9 w-auto object-contain"
          />
          <Link
            href="/login"
            className="text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Sign in
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12 text-center">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
            Storefront
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Storefront coming soon
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-muted">
            You continued as a guest. Catalog, cart, and checkout will be built
            here next while login stays available anytime.
          </p>
        </section>

        <div className="flex flex-col gap-3 pb-2">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-leaf/20 bg-white text-sm font-semibold text-ink transition hover:border-leaf/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Back to welcome
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-full bg-track text-sm font-semibold text-white transition hover:bg-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
