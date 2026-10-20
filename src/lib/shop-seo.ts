/**
 * Shop SEO identity (name + share/profile image).
 *
 * Source of truth is the shop profile from the customer API, but that API
 * currently exposes no shop-profile endpoint (verified 2026-10-20:
 * `/storefront/shop`, `/storefront/profile`, `/storefront/config` -> 404).
 * So until the backend provides one, set `NEXT_PUBLIC_SHOP_PROFILE_URL`
 * to its full URL and this helper will use it; otherwise it falls back to
 * Yaadro branding with the purple D logo — never a broken/empty image.
 */

export type ShopSeo = {
  name: string;
  /** Absolute or root-relative share image URL. */
  image: string;
  description: string;
};

const FALLBACK: ShopSeo = {
  name: "Yaadro",
  image: "/icons/og-image.png",
  description: "Fresh groceries, right at your door.",
};

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function getShopSeo(): Promise<ShopSeo> {
  const url = process.env.NEXT_PUBLIC_SHOP_PROFILE_URL;
  if (!url) return FALLBACK;

  try {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID;
    const res = await fetch(url, {
      headers: shopId ? { "x-shop-id": shopId } : undefined,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK;

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object") return FALLBACK;

    const root = json as Record<string, unknown>;
    const nested =
      (root.data as Record<string, unknown> | undefined) ??
      (root.shop as Record<string, unknown> | undefined) ??
      root;

    const name =
      pickString(nested.name, nested.shopName, nested.title) ?? FALLBACK.name;
    const image =
      pickString(
        nested.logoUrl,
        nested.logo,
        nested.profileImageUrl,
        nested.imageUrl,
        nested.image,
      ) ?? FALLBACK.image;
    const description =
      pickString(nested.description, nested.tagline) ?? FALLBACK.description;

    return { name, image, description };
  } catch {
    return FALLBACK;
  }
}
