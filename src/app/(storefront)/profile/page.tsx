import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/navigation/BackButton";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Yaadro account.",
};

export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 pt-1">
        {/* Variant: light */}
        <BackButton href="/home" variant="light" />
        <span className="text-xs font-medium text-muted">Back · Light</span>
      </div>
      <p className="mt-6 text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
        Profile
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        Coming soon
      </h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">
        Account details will live here. Sign in anytime to get started.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-track text-sm font-semibold text-white transition hover:bg-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        Go to login
      </Link>
    </main>
  );
}
