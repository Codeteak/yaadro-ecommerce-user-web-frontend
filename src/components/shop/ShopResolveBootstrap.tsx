"use client";

import { useEffect } from "react";
import { resolveShopByDomain } from "@/lib/api/shop";
import {
  cacheResolvedShop,
  type CachedShopBanners,
} from "@/lib/resolved-shop";
import { SHOP_IMAGE_FALLBACK } from "@/lib/shop-fallback-avatars";

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.endsWith(".localhost")
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function mapBanners(raw: unknown): CachedShopBanners {
  if (!Array.isArray(raw)) return [];
  const out: CachedShopBanners = [];
  raw.forEach((item, index) => {
    if (typeof item === "string" && item.trim()) {
      out.push({
        id: `banner-${index}`,
        title: "",
        subtitle: "",
        image: item.trim(),
        href: "/home",
      });
      return;
    }
    const row = asRecord(item);
    if (!row) return;
    const image = pickString(
      row.url,
      row.image,
      row.src,
      row.imageUrl,
      row.image_url,
      row.bannerUrl,
      row.banner_url,
    );
    if (!image) return;
    out.push({
      id: pickString(row.id) ?? `banner-${index}`,
      title: pickString(row.title, row.name) ?? "",
      subtitle: pickString(row.subtitle, row.description) ?? "",
      image,
      href: pickString(row.href, row.link) ?? "/home",
    });
  });
  return out;
}

/**
 * On real shop domains, resolve shop id + banners into localStorage
 * (same approach as main `shopResolver`) so cart keys and x-shop-id match.
 */
export function ShopResolveBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (!host || isLocalHost(host)) return;

    let cancelled = false;
    void (async () => {
      try {
        const payload = await resolveShopByDomain(host);
        if (cancelled) return;
        const row = asRecord(payload);
        if (!row) return;
        const id = pickString(row.shop_id, row.shopId);
        const name = pickString(row.shop_name, row.shopName, row.name);
        if (!id || !name) return;
        const seo = asRecord(row.seo);
        const og = asRecord(seo?.og);
        const image =
          pickString(row.shop_image, row.shopImage, og?.image) ??
          SHOP_IMAGE_FALLBACK;
        const bannerEnabled = row.banner_enabled !== false && row.bannerEnabled !== false;
        const banners = bannerEnabled
          ? mapBanners(row.banner_images ?? row.bannerImages)
          : [];
        cacheResolvedShop({
          host,
          id,
          name,
          image,
          bannerEnabled,
          banners,
        });
      } catch {
        // keep NEXT_PUBLIC_DEFAULT_SHOP_ID / legacy NEXT_PUBLIC_SHOP_ID
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
