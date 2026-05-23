import { getProductById } from './productApi';
import { formatShopPageTitle } from './shopResolver';
import {
  getResolvedProductImageUrls,
  toImageSrcString,
  PRODUCT_IMAGE_PLACEHOLDER,
} from './productImages';
import { upsertMeta, upsertLink } from './documentMeta';

function envShopName() {
  return (
    (process.env.NEXT_PUBLIC_SHOP_NAME && String(process.env.NEXT_PUBLIC_SHOP_NAME).trim()) ||
    'Yaadro'
  );
}

export function getSiteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    '';
  return String(raw).trim().replace(/\/+$/, '');
}

/** Absolute URL required for Open Graph / Twitter cards. */
export function toAbsoluteMediaUrl(url, siteOrigin = getSiteOrigin()) {
  const src = toImageSrcString(url);
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/') && siteOrigin) {
    return `${siteOrigin}${src}`;
  }
  return src;
}

export function getProductSocialDescription(product) {
  if (!product) return '';
  const raw = product.description ?? product.shortDescription ?? '';
  const text =
    typeof raw === 'string'
      ? raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';
  if (text) return text.slice(0, 200);
  const name = product.name ? String(product.name).trim() : 'Product';
  return `Shop ${name} online.`;
}

export function productCanonicalPath(product, lookup, pathPrefix = '/products') {
  const segment = encodeURIComponent(
    String(product?.slug || product?.id || lookup || '').trim()
  );
  if (!segment) return `${pathPrefix}/`;
  return `${pathPrefix}/${segment}/`;
}

export function buildProductMetadataObject(product, options = {}) {
  const shopName = options.shopName || envShopName();
  const siteOrigin = options.siteOrigin ?? getSiteOrigin();
  const lookup = options.lookup || '';
  const pathPrefix = options.pathPrefix || '/products';

  if (!product) {
    return {
      title: 'Product',
      description: `Shop on ${shopName}`,
    };
  }

  const name = String(product.name || 'Product').trim() || 'Product';
  const pageTitle = formatShopPageTitle(name, shopName);
  const description = getProductSocialDescription(product);
  const images = getResolvedProductImageUrls(product);
  const primary =
    images.find((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER) || images[0] || '';
  const ogImage = toAbsoluteMediaUrl(primary, siteOrigin);
  const path = productCanonicalPath(product, lookup, pathPrefix);
  const canonical = siteOrigin ? `${siteOrigin}${path}` : path;

  const openGraph = {
    title: pageTitle,
    description,
    url: canonical,
    type: 'website',
    siteName: shopName,
  };
  if (ogImage) {
    openGraph.images = [{ url: ogImage, alt: name, width: 1200, height: 630 }];
  }

  const twitter = {
    card: ogImage ? 'summary_large_image' : 'summary',
    title: pageTitle,
    description,
  };
  if (ogImage) twitter.images = [ogImage];

  return {
    title: name,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph,
    twitter,
  };
}

/**
 * Next.js `generateMetadata` helper — fetch product and build OG tags with product image.
 */
export async function generateProductMetadataForId(lookup, options = {}) {
  const id = lookup != null ? String(lookup).trim() : '';
  const shopName = options.shopName || envShopName();
  if (!id) {
    return buildProductMetadataObject(null, { shopName, ...options });
  }
  const product = await getProductById(id, { quiet: true });
  return buildProductMetadataObject(product, {
    shopName,
    lookup: id,
    ...options,
  });
}

/** Client: update OG/Twitter tags after product loads (in-app + JS-aware crawlers). */
export function applyProductSocialMetaToDocument({
  title,
  description,
  imageUrl,
  url,
  siteName,
}) {
  if (typeof document === 'undefined') return;
  if (title) {
    document.title = title;
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);
  }
  if (description) {
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:description', description);
  }
  if (siteName) {
    upsertMeta('property', 'og:site_name', siteName);
  }
  if (url) {
    upsertMeta('property', 'og:url', url);
  }
  upsertMeta('property', 'og:type', 'website');
  const absImage = toAbsoluteMediaUrl(imageUrl);
  if (absImage) {
    upsertMeta('property', 'og:image', absImage);
    upsertMeta('name', 'twitter:image', absImage);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
  }
  if (url) {
    upsertLink('canonical', url);
  }
}

export function buildProductShareUrl(product, lookup, siteOrigin) {
  const origin =
    siteOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : getSiteOrigin());
  const path = productCanonicalPath(product, lookup, '/products');
  return origin ? `${origin.replace(/\/+$/, '')}${path}` : path;
}
