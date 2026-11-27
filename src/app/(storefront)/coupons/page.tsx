import type { Metadata } from "next";
import { Suspense } from "react";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";
import { StorefrontRouteShell } from "@/components/ui/skeletons";

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
    <Suspense fallback={<StorefrontRouteShell />}>
      <CouponsPageContent backHref="/profile" live ticketDensity="comfortable" />
    </Suspense>
  );
}
