"use client";

import Image from "next/image";
import Link from "next/link";
import { GreenCornerAccents } from "./GreenCornerAccents";
import { OnboardingSwipe } from "./OnboardingSwipe";

export function OnboardingScreen() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">
      <GreenCornerAccents intensity="soft" />

      <Image
        src="/onboarding/leaf-accent.svg"
        alt=""
        width={56}
        height={74}
        unoptimized
        aria-hidden
        className="pointer-events-none absolute top-[18%] left-[4%] opacity-40 blur-[1.5px] onboarding-float sm:left-[10%]"
      />
      <Image
        src="/onboarding/leaf-accent.svg"
        alt=""
        width={44}
        height={58}
        unoptimized
        aria-hidden
        className="pointer-events-none absolute top-[42%] right-[3%] rotate-12 opacity-35 blur-[2px] onboarding-float sm:right-[12%]"
        style={{ animationDelay: "1.4s" }}
      />
      <Image
        src="/onboarding/leaf-accent.svg"
        alt=""
        width={36}
        height={48}
        unoptimized
        aria-hidden
        className="pointer-events-none absolute bottom-[22%] left-[8%] -rotate-12 opacity-30 blur-[2.5px] onboarding-float sm:left-[16%]"
        style={{ animationDelay: "0.7s" }}
      />

      <div className="relative z-10 mx-auto flex h-dvh w-full max-w-xl flex-col items-center px-3 pt-[max(2.75rem,calc(env(safe-area-inset-top)+2rem))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:max-w-2xl sm:px-6">
        <header className="onboarding-fade-up flex w-full shrink-0 flex-col items-center px-2">
          <Image
            src="/onboarding/brand-logo.svg"
            alt="Yaadro"
            width={44}
            height={52}
            priority
            unoptimized
            className="h-11 w-auto object-contain"
          />
          <h1 className="onboarding-fade-up-delay mt-2 text-center text-[1.7rem] leading-[1.12] font-bold tracking-tight sm:text-[2.1rem]">
            <span className="block text-forest">Fresh Groceries,</span>
            <span className="block text-leaf-bright">Right at Your Door</span>
          </h1>
          <p className="onboarding-fade-up-delay-2 mt-0.5 text-center text-[12px] leading-4 text-muted sm:text-[13px]">
            Healthy choices. Better living.
          </p>
        </header>

        <div className="relative mt-1 mb-1 min-h-0 w-[100vw] max-w-none flex-1 py-1.5 sm:w-full">
          <div className="onboarding-hero-float relative mx-auto h-full w-full max-w-[640px]">
            <div
              className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(220,252,231,0.85)_0%,rgba(187,247,208,0.4)_45%,transparent_72%)]"
              aria-hidden
            />
            <Image
              src="/onboarding/image-hero.png"
              alt="Canvas tote bag filled with fresh groceries"
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-contain drop-shadow-[0_12px_24px_rgba(6,78,59,0.1)]"
            />
          </div>
        </div>

        <footer className="flex w-full shrink-0 flex-col items-center gap-2 px-2 pb-0.5">
          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          </div>
          <OnboardingSwipe />
          <Link
            href="/home"
            className="text-[13px] font-medium text-muted transition hover:text-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Continue without login
          </Link>
        </footer>
      </div>
    </main>
  );
}
