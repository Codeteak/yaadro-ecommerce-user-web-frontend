import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { GreenCornerAccents } from "@/components/onboarding/GreenCornerAccents";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to Yaadro with your mobile number.",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
      <GreenCornerAccents intensity="soft" />

      <div className="relative z-10 mx-auto flex h-dvh w-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <PageHeader
          backHref="/"
          center={
            <Image
              src="/onboarding/brand-logo.svg"
              alt="Yaadro"
              width={40}
              height={48}
              priority
              unoptimized
              className="h-9 w-auto object-contain"
            />
          }
        />

        {/* Hero fills leftover space above the content-sized login panel */}
        <div className="relative mt-1 mb-2 min-h-0 w-full flex-1">
          <div className="relative mx-auto h-full w-full max-w-sm">
            <div
              className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(220,252,231,0.85)_0%,rgba(187,247,208,0.35)_45%,transparent_72%)]"
              aria-hidden
            />
            <Image
              src="/onboarding/image-hero.png"
              alt="Canvas tote bag filled with fresh groceries"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-contain drop-shadow-[0_10px_20px_rgba(47,107,47,0.1)]"
            />
          </div>
        </div>

        {/* Content-height panel pinned to bottom — do not use flex-1 or it climbs the screen */}
        <section className="login-panel-enter relative -mx-3 shrink-0 rounded-t-[1.75rem] bg-paper px-1 pt-3 pb-1 shadow-[0_-12px_40px_rgba(47,107,47,0.1)] ring-1 ring-black/5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" aria-hidden />
          <div className="px-4 pb-2">
            <LoginForm />
            <Link
              href="/home"
              className="mt-5 mb-1 block text-center text-sm font-medium text-muted transition hover:text-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Continue without login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
