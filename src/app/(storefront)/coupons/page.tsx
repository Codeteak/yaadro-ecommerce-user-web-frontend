import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Your Yaadro vouchers and coupons.",
};

export default function CouponsPage() {
  return (
    <ComingSoonPage
      title="Coupons"
      description="Your vouchers and coupon offers will appear here once coupons are connected."
    />
  );
}
