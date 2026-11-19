/**
 * Shop contact for Help & Support (#15).
 * Name comes from live shop SEO. Phone / address are optional until the
 * customer API exposes them — set NEXT_PUBLIC_SHOP_SUPPORT_* to enable
 * Call / WhatsApp / Location on `/profile/support`.
 */

import "server-only";

import { getShopSeo } from "@/lib/shop-seo";
import type { ShopSupportContact } from "@/lib/sample-shop-support";

export type { ShopSupportContact };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatDisplayPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = digitsOnly(trimmed);
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return trimmed;
}

function phoneTelHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return `+${digitsOnly(trimmed)}`;
  const digits = digitsOnly(trimmed);
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/**
 * Live shop name + optional support phone / address from env.
 */
export async function getShopSupportContact(): Promise<ShopSupportContact> {
  const shop = await getShopSeo();
  const phoneRaw = process.env.NEXT_PUBLIC_SHOP_SUPPORT_PHONE?.trim() ?? "";
  const addressRaw =
    process.env.NEXT_PUBLIC_SHOP_SUPPORT_ADDRESS?.trim() ?? "";
  const mapsHref = process.env.NEXT_PUBLIC_SHOP_SUPPORT_MAPS_URL?.trim();
  const phoneTel = phoneTelHref(phoneRaw);
  const whatsappNumber = digitsOnly(phoneRaw);

  return {
    shopName: shop.name,
    phone: formatDisplayPhone(phoneRaw),
    phoneTel,
    whatsappNumber,
    addressLines: addressRaw
      ? addressRaw
          .split("|")
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    ...(mapsHref ? { mapsHref } : {}),
  };
}
