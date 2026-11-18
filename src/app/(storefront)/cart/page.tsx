import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/CartPageContent";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your Yaadro basket — review items before checkout.",
};

export default function CartPage() {
  return (
    <CartPageContent
      couponPickerHref="/coupons?from=cart"
      showPriceMayVary
      priceMayVaryPlacement="above-add-more"
      showCartSuggestions
      highlightSavings
      showTopCoupons
      showMinCartValue
      minCartValueRupees={499}
    />
  );
}
