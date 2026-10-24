import type { Metadata } from "next";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Your Yaadro vouchers and coupons.",
};

/**
 * Coupons list + details / copy. Data via `listCoupons()` façade
 * (sample until a coupons API exists).
 */
export default function CouponsPage() {
  return <CouponsPageContent backHref="/profile" />;
}
