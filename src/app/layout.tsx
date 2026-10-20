import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getShopSeo } from "@/lib/shop-seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

function siteBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // fall through to default below
    }
  }
  // Default from .env.example; override with NEXT_PUBLIC_SITE_URL in prod.
  return new URL("https://yaadro.online");
}

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopSeo();

  return {
    metadataBase: siteBase(),
    applicationName: shop.name,
    title: {
      default: shop.name,
      template: `%s · ${shop.name}`,
    },
    description: shop.description,
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      siteName: shop.name,
      title: shop.name,
      description: shop.description,
      images: [{ url: shop.image, alt: shop.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: shop.name,
      description: shop.description,
      images: [shop.image],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#22c55e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
