import type { Metadata } from "next";
import { Suspense } from "react";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Your Yaadro vouchers and coupons.",
};

/**
 * Coupons list + details. From profile: copy code.
 * From cart (`?from=cart`): Apply to cart and return to `/cart`.
 */
export default function CouponsPage() {
  return (
    <Suspense fallback={<div className="mx-auto min-h-dvh w-full max-w-lg bg-paper" />}>
      <CouponsPageContent backHref="/profile" live ticketDensity="comfortable" />
    </Suspense>
  );
}
