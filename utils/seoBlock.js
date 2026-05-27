import { upsertMeta, upsertLink } from './documentMeta';

const UUID_RE = /^[0-9a-f-]{36}$/i;

const NEXT_OPEN_GRAPH_TYPES = new Set([
  'website',
  'article',
  'book',
  'profile',
  'music.song',
  'music.album',
  'music.playlist',
  'music.radio_station',
  'video.movie',
  'video.episode',
  'video.tv_show',
  'video.other',
]);

function resolveAbsoluteUrl(url, siteOrigin = '') {
  const src = url != null ? String(url).trim() : '';
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  const origin =
    siteOrigin ||
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
  if (src.startsWith('/') && origin) return `${origin}${src}`;
  return src;
}

function normalizeNextOpenGraphType(raw) {
  const t = String(raw || '').trim();
  if (!t) return 'website';
  // Backend may return non-Next values like "product"; map to closest supported type.
  if (t === 'product') return 'website';
  if (NEXT_OPEN_GRAPH_TYPES.has(t)) return t;
  return 'website';
}

/** @typedef {{
 *   title?: string,
 *   description?: string,
 *   keywords?: string,
 *   canonicalUrl?: string,
 *   locale?: string,
 *   themeColor?: string|null,
 *   og?: { type?: string, image?: string, imageWidth?: number, imageHeight?: number, imageAlt?: string },
 *   twitter?: { card?: string },
 * }} SeoBlock */

/** Normalize API `seo` object from resolve-by-domain or `/seo/metadata`. */
export function normalizeSeoBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const og = raw.og && typeof raw.og === 'object' ? raw.og : {};
  const twitter = raw.twitter && typeof raw.twitter === 'object' ? raw.twitter : {};
  const title = String(raw.title || '').trim();
  const description = String(raw.description || '').trim();
  if (!title && !description) return null;

  const themeRaw = raw.themeColor ?? raw.theme_color;
  const themeColor =
    themeRaw != null && String(themeRaw).trim() ? String(themeRaw).trim() : null;

  return {
    title,
    description,
    keywords: String(raw.keywords || '').trim(),
    canonicalUrl: String(raw.canonicalUrl || raw.canonical_url || '').trim(),
    locale: String(raw.locale || 'en_IN').trim() || 'en_IN',
    themeColor,
    og: {
      type: String(og.type || 'website').trim() || 'website',
      image: String(og.image || '').trim(),
      imageWidth: typeof og.imageWidth === 'number' ? og.imageWidth : undefined,
      imageHeight: typeof og.imageHeight === 'number' ? og.imageHeight : undefined,
      imageAlt: String(og.imageAlt || og.image_alt || '').trim(),
    },
    twitter: {
      card: String(twitter.card || 'summary_large_image').trim() || 'summary_large_image',
    },
  };
}

export function extractSeoFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  let root = payload;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    root = root.data;
  }
  return normalizeSeoBlock(root.seo);
}

export function localeToHtmlLang(locale) {
  const l = String(locale || 'en_IN').trim();
  if (!l) return 'en';
  return l.replace('_', '-');
}

/** Map backend SEO block → Next.js `Metadata` (App Router). */
export function seoBlockToNextMetadata(seo, options = {}) {
  if (!seo) return options.fallback || {};

  const siteOrigin = options.siteOrigin || '';
  const canonical = seo.canonicalUrl || options.canonicalUrl || '';
  const ogImage = resolveAbsoluteUrl(seo.og?.image, siteOrigin);
  const ogTitle = seo.title;
  const ogDescription = seo.description;
  const twitterCard = seo.twitter?.card || (ogImage ? 'summary_large_image' : 'summary');

  const openGraph = {
    title: ogTitle,
    description: ogDescription,
    url: canonical || undefined,
    type: normalizeNextOpenGraphType(seo.og?.type),
    locale: seo.locale,
    siteName: options.siteName,
  };

  if (ogImage) {
    openGraph.images = [
      {
        url: ogImage,
        width: seo.og?.imageWidth || 1200,
        height: seo.og?.imageHeight || 630,
        alt: seo.og?.imageAlt || ogTitle,
      },
    ];
  }

  const twitter = {
    card: twitterCard,
    title: ogTitle,
    description: ogDescription,
  };
  if (ogImage) twitter.images = [ogImage];

  const meta = {
    title: seo.title,
    description: seo.description || undefined,
    alternates: canonical ? { canonical } : undefined,
    openGraph,
    twitter,
  };

  if (seo.keywords) {
    meta.keywords = seo.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }

  return meta;
}

/** Client: write SEO block into `document.head` (SPA + post-hydration). */
export function applySeoBlockToDocument(seo, options = {}) {
  if (typeof document === 'undefined' || !seo) return;

  const siteOrigin = options.siteOrigin || '';
  const title = seo.title;
  const description = seo.description;
  const canonical = seo.canonicalUrl || options.canonicalUrl || '';
  const ogImage = resolveAbsoluteUrl(seo.og?.image, siteOrigin);
  const ogType = seo.og?.type || 'website';
  const twitterCard = seo.twitter?.card || (ogImage ? 'summary_large_image' : 'summary');

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
  if (seo.keywords) {
    upsertMeta('name', 'keywords', seo.keywords);
  }
  if (options.siteName) {
    upsertMeta('property', 'og:site_name', options.siteName);
  }
  if (canonical) {
    upsertMeta('property', 'og:url', canonical);
    upsertLink('canonical', canonical);
  }
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:locale', seo.locale || 'en_IN');
  if (ogImage) {
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:image', ogImage);
    if (seo.og?.imageAlt) {
      upsertMeta('property', 'og:image:alt', seo.og.imageAlt);
    }
  }
  upsertMeta('name', 'twitter:card', twitterCard);
  if (seo.themeColor) {
    upsertMeta('name', 'theme-color', seo.themeColor);
  }

  const lang = localeToHtmlLang(seo.locale);
  if (lang && document.documentElement) {
    document.documentElement.lang = lang;
  }
}

export function isUuidSegment(value) {
  return UUID_RE.test(String(value || '').trim());
}
