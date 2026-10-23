import type { MetadataRoute } from "next";
import { getShopSeo } from "@/lib/shop-seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const shop = await getShopSeo();

  return {
    name: shop.name,
    short_name: shop.name.slice(0, 12),
    description: shop.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7fbf7",
    theme_color: "#5cb85c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
