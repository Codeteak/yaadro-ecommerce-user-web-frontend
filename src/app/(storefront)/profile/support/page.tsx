import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpSupportRoute } from "@/components/profile/HelpSupportRoute";
import { getShopSupportContact } from "@/lib/shop-support";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Get help with your Yaadro orders.",
};

async function SupportPageBody() {
  const contact = await getShopSupportContact();
  return <HelpSupportRoute contact={contact} />;
}

/**
 * `getShopSupportContact` → `getShopSeo()` reads `headers()` — keep behind
 * Suspense so the route can still prerender a shell.
 */
export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-dvh w-full max-w-lg bg-paper px-5 pt-8">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-mint/60" />
          <div className="mt-4 h-16 animate-pulse rounded-2xl bg-mint/40" />
        </div>
      }
    >
      <SupportPageBody />
    </Suspense>
  );
}
