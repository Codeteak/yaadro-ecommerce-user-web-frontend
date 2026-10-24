import type { Metadata } from "next";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Yaadro products.",
};

export default function WishlistPage() {
  return <WishlistPageContent />;
}
