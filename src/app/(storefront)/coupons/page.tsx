import type { Metadata } from "next";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Your Yaadro vouchers and coupons.",
};

/**
 * Coupons list + details / copy. Storefront shows empty until a coupons API
 * is connected (sample list remains on playground `coupons-list`).
 * Apply-on-checkout remains planned (playground `coupons-apply`).
 */
export default function CouponsPage() {
  return <CouponsPageContent backHref="/profile" coupons={[]} />;
}
