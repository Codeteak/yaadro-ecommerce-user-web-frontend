"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Star } from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { useCart } from "@/components/cart/CartContext";
import { useWishlistOptional } from "@/components/wishlist/WishlistContext";
import {
  productImages,
  resolveProductDescription,
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";
import { ProductCard } from "./ProductCard";
import { ProductGallery } from "./ProductGallery";

type ProductDetailProps = {
  product: SampleProduct;
  /** Related strip; defaults to same-category sample products. */
  related?: SampleProduct[];
  backHref?: string;
  onBackClick?: () => void;
};

function defaultRelated(product: SampleProduct): SampleProduct[] {
  return SAMPLE_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, 6);
}

function formatWeightKg(weightKg: number): string {
  return Number.isInteger(weightKg) ? String(weightKg) : weightKg.toFixed(1);
}

/**
 * Product detail composition (playground-first). Gallery, price, optional
 * description / ingredients, qty + add, and a related horizontal strip
 * of the same ProductCard used on home.
 * Uses local cart; no checkout or API.
 */
export function ProductDetail({
  product,
  related,
  backHref,
  onBackClick,
}: ProductDetailProps) {
  const router = useRouter();
  const wishlist = useWishlistOptional();
  const { getItem, setQty, setCustomizing } = useCart();
  const [localWishlisted, setLocalWishlisted] = useState(false);

  const cartItem = getItem(product.id);
  const qty = cartItem?.qty ?? 0;
  const weightKg = cartItem?.weightKg;
  const images = productImages(product);
  const description = resolveProductDescription(product);
  const relatedList = related ?? defaultRelated(product);
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const wishlisted = wishlist
    ? wishlist.signedIn && wishlist.has(product.id)
    : localWishlisted;

  const onWishlistClick = () => {
    if (!wishlist) {
      setLocalWishlisted((w) => !w);
      return;
    }
    if (!wishlist.signedIn) {
      router.push("/login");
      return;
    }
    wishlist.toggle(product.id);
  };

  return (
    <div className="flex flex-col bg-paper pb-8">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="relative flex h-11 shrink-0 items-center">
          <BackButton
            href={backHref}
            onClick={onBackClick}
            label="Back"
          />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight whitespace-nowrap text-forest">
            Product Details
          </h1>
          <button
            type="button"
            onClick={onWishlistClick}
            aria-pressed={wishlisted}
            aria-label={
              wishlist && !wishlist.signedIn
                ? `Sign in to save ${product.name}`
                : wishlisted
                  ? `Remove ${product.name} from wishlist`
                  : `Add ${product.name} to wishlist`
            }
            className="ml-auto flex size-11 cursor-pointer items-center justify-center rounded-full text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <Heart
              className={`h-5 w-5 transition ${
                wishlisted ? "fill-red-500 text-red-500" : "text-forest"
              }`}
              aria-hidden
            />
          </button>
        </header>
      </div>

      <div className="mt-3">
        <ProductGallery images={images} alt={product.name} />
      </div>

      <div className="mt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">
              {product.name}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-muted">{product.unit}</p>
          </div>
          {product.rating ? (
            <p className="flex shrink-0 items-center gap-1 pt-1 text-[13px] font-semibold text-muted">
              <Star
                className="h-3.5 w-3.5 fill-track text-track"
                aria-hidden
              />
              <span className="text-forest tabular-nums">
                {product.rating.value.toFixed(1)}
              </span>
              <span className="font-medium">({product.rating.count})</span>
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-2xl font-extrabold text-black tabular-nums">
            ₹{product.price}
          </p>
          {discount > 0 ? (
            <>
              <p className="text-sm font-medium text-muted tabular-nums line-through">
                ₹{product.mrp}
              </p>
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-bold text-forest">
                {discount}% OFF
              </span>
            </>
          ) : null}
        </div>

        {description ? (
          <section className="mt-5">
            <h3 className="text-sm font-bold text-forest">Description</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
          </section>
        ) : null}

        {product.ingredients ? (
          <section className="mt-4">
            <h3 className="text-sm font-bold text-forest">Ingredients</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              {product.ingredients}
            </p>
          </section>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          {product.customization ? (
            <button
              type="button"
              onClick={() => setCustomizing(product)}
              aria-label={
                weightKg
                  ? `Change weight of ${product.name}, currently ${weightKg} kilograms`
                  : `Choose weight for ${product.name}`
              }
              className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl bg-track px-4 text-sm font-semibold text-black shadow-[0_12px_28px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              {weightKg ? `${formatWeightKg(weightKg)} kg` : "Choose weight"}
            </button>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => setQty(product.id, 1)}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-2xl bg-track px-4 text-sm font-semibold text-black shadow-[0_12px_28px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex h-12 min-w-0 flex-1 items-center justify-between gap-1 rounded-2xl bg-track px-2 text-black shadow-[0_12px_28px_rgba(47,107,47,0.28)]">
              <button
                type="button"
                onClick={() => setQty(product.id, qty - 1)}
                aria-label={`Decrease quantity of ${product.name}`}
                className="grid size-10 cursor-pointer place-items-center rounded-xl text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf"
              >
                <Minus className="h-5 w-5" aria-hidden />
              </button>
              <span
                key={qty}
                className="qty-pop min-w-8 text-center text-base font-extrabold text-black tabular-nums"
                aria-live="polite"
                aria-label={`Quantity ${qty}`}
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(product.id, qty + 1)}
                aria-label={`Increase quantity of ${product.name}`}
                className="grid size-10 cursor-pointer place-items-center rounded-xl text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf"
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {relatedList.length > 0 ? (
          <section className="mt-8">
            <h3 className="text-base font-extrabold text-ink">
              You May Also Like
            </h3>
            <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {relatedList.map((item) => (
                <li key={item.id} className="w-[10.5rem] min-w-[10.5rem] shrink-0">
                  <ProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
