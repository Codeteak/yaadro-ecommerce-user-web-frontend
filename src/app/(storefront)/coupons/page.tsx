import type { Metadata } from "next";
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
  return <CouponsPageContent backHref="/profile" />;
}
