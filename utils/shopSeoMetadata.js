/**
 * Server-side shop SEO for Next.js `generateMetadata` (EC2 `next start`).
 * Soft-fails to null so layout keeps build-time defaults (static export / missing host).
 */

import { headers } from 'next/headers';
import { fetchAtBuildTime, getBuildApiBaseUrl, unwrapApiPayload } from './buildTimeApi';
import { normalizeSeoBlock, seoBlockToNextMetadata } from './seoBlock';
import { normalizeShopResolvePayload } from './shopResolver';

function requestHostname() {
  try {
    const h = headers();
    const raw =
      h.get('x-forwarded-host') ||
      h.get('host') ||
      '';
    const host = String(raw).split(',')[0].trim().toLowerCase();
    if (!host) return '';
    return host.replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function absoluteMediaUrl(url, siteOrigin) {
  const src = url != null ? String(url).trim() : '';
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  const origin = String(siteOrigin || '').replace(/\/+$/, '');
  if (src.startsWith('/') && origin) return `${origin}${src}`;
  return src;
}

/**
 * Resolve per-request shop metadata for WhatsApp / OG crawlers.
 * @returns {Promise<import('next').Metadata|null>}
 */
export async function generateShopMetadataForRequest() {
  if (process.env.NEXT_STATIC_EXPORT === 'true') return null;
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;

  try {
    const hostname = requestHostname();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return null;
    }

    const siteOrigin = `https://${hostname}`;
    const base = getBuildApiBaseUrl();
    const resolveUrl = `${base}/shops/resolve-by-domain?domain=${encodeURIComponent(hostname)}`;

    const json = await fetchAtBuildTime(resolveUrl, {
      headers: { Accept: 'application/json' },
      timeoutMs: 8_000,
    });
    const payload = unwrapApiPayload(json);
    const { shopName, shopImage, seo: resolvedSeo } = normalizeShopResolvePayload(payload);

    // Prefer API seo, but never keep generic "Online Grocery" copy when we know the shop.
    let seo = resolvedSeo;
    if (shopName) {
      const apiTitle = String(seo?.title || '').trim();
      const apiDesc = String(seo?.description || '').trim();
      const titleLooksGeneric =
        !apiTitle ||
        /online grocery/i.test(apiTitle) ||
        apiTitle.toLowerCase() === 'online grocery';
      const descLooksGeneric =
        !apiDesc ||
        /order groceries online from (your local store|.*)\.?$/i.test(apiDesc) ||
        /online grocery/i.test(apiDesc);

      seo = normalizeSeoBlock({
        title: titleLooksGeneric ? shopName : apiTitle,
        description: descLooksGeneric ? shopName : apiDesc,
        keywords: seo?.keywords || '',
        canonicalUrl: seo?.canonicalUrl || `${siteOrigin}/`,
        locale: seo?.locale || 'en_IN',
        themeColor: seo?.themeColor,
        og: {
          type: seo?.og?.type || 'website',
          image: seo?.og?.image || shopImage || '',
          imageWidth: seo?.og?.imageWidth,
          imageHeight: seo?.og?.imageHeight,
          imageAlt: seo?.og?.imageAlt || shopName,
        },
        twitter: { card: seo?.twitter?.card || 'summary_large_image' },
      });
    }

    if (!seo) return null;

    if (!seo.og?.image && shopImage) {
      seo = {
        ...seo,
        og: {
          ...(seo.og || {}),
          image: absoluteMediaUrl(shopImage, siteOrigin),
          imageAlt: seo.og?.imageAlt || shopName || seo.title,
        },
      };
    } else if (seo.og?.image) {
      seo = {
        ...seo,
        og: {
          ...seo.og,
          image: absoluteMediaUrl(seo.og.image, siteOrigin),
        },
      };
    }

    if (!seo.canonicalUrl) {
      seo = { ...seo, canonicalUrl: `${siteOrigin}/` };
    }

    const siteName = shopName || seo.title;
    const meta = seoBlockToNextMetadata(seo, {
      siteName,
      siteOrigin,
      canonicalUrl: seo.canonicalUrl || `${siteOrigin}/`,
    });

    if (!meta || (!meta.title && !meta.description)) return null;

    // Root layout uses title.default + template; force shop-only branding for crawlers.
    const titleText = shopName || (typeof meta.title === 'string' ? meta.title : '');
    if (titleText) {
      meta.title = {
        default: titleText,
        template: `%s | ${shopName || titleText}`,
      };
      meta.applicationName = titleText;
      meta.appleWebApp = {
        capable: true,
        title: titleText,
        statusBarStyle: 'default',
      };
      const descriptionText =
        (typeof meta.description === 'string' && meta.description.trim()) || titleText;
      meta.description = descriptionText;
      if (meta.openGraph) {
        meta.openGraph = {
          ...meta.openGraph,
          title: titleText,
          description: descriptionText,
          siteName: titleText,
        };
      }
      if (meta.twitter) {
        meta.twitter = {
          ...meta.twitter,
          title: titleText,
          description: descriptionText,
        };
      }
    }

    return meta;
  } catch {
    return null;
  }
}
