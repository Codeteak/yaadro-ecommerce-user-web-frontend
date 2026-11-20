/**
 * Tenant SEO for Cloudflare Pages (edge).
 * Fetches shop/product SEO from the Yaadro API and injects tags into static HTML.
 */

const DEFAULT_API_ORIGIN = 'https://customer.yaadro.online';

export function apiOriginFromEnv(env) {
  const raw = env?.API_ORIGIN || env?.NEXT_PUBLIC_API_URL || DEFAULT_API_ORIGIN;
  return String(raw).trim().replace(/\/+$/, '');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

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
      imageWidth: typeof og.imageWidth === 'number' ? og.imageWidth : 1200,
      imageHeight: typeof og.imageHeight === 'number' ? og.imageHeight : 630,
      imageAlt: String(og.imageAlt || og.image_alt || '').trim(),
    },
    twitter: {
      card: String(twitter.card || 'summary_large_image').trim() || 'summary_large_image',
    },
  };
}

function unwrapPayload(json) {
  if (!json || typeof json !== 'object') return json;
  if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) return json.data;
  return json;
}

function shopIdFromResolve(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.shopId || data.shop_id || data.id || '').trim();
}

function shopNameFromResolve(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.shopName || data.shop_name || data.name || '').trim();
}

function seoFromResolve(data) {
  if (!data || typeof data !== 'object') return null;
  return normalizeSeoBlock(data.seo);
}

/** @param {string} pathname */
export function parseProductSlug(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  let m = path.match(/^\/products\/([^/]+)$/);
  if (m && m[1] !== 'detail') return decodeURIComponent(m[1]);
  m = path.match(/^\/product\/([^/]+)$/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

async function cachedJsonGet(url, init = {}, ttlSeconds = 300) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) {
    try {
      return await hit.json();
    } catch {
      /* refetch */
    }
  }

  const res = await fetch(url, init);
  if (!res.ok) return null;
  const json = await res.json();

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  await cache.put(
    cacheKey,
    new Response(JSON.stringify(json), { status: 200, headers })
  );

  return json;
}

/**
 * Resolve tenant SEO for the request host + path.
 * @returns {Promise<{ seo: object|null, shopName: string, shopId: string }>}
 */
export async function resolveTenantSeo(hostname, pathname, env) {
  const domain = String(hostname || '').toLowerCase().trim();
  if (!domain) return { seo: null, shopName: '', shopId: '' };

  const apiOrigin = apiOriginFromEnv(env);
  const resolveUrl = `${apiOrigin}/api/shops/resolve-by-domain?domain=${encodeURIComponent(domain)}`;

  const resolveJson = await cachedJsonGet(resolveUrl, {
    headers: { Accept: 'application/json' },
  });
  const resolveData = unwrapPayload(resolveJson);
  const shopId = shopIdFromResolve(resolveData);
  const shopName = shopNameFromResolve(resolveData);
  let seo = seoFromResolve(resolveData);

  const slug = parseProductSlug(pathname);
  if (slug && shopId) {
    const metaUrl = `${apiOrigin}/api/seo/metadata?pageType=product&slug=${encodeURIComponent(slug)}`;
    const metaJson = await cachedJsonGet(metaUrl, {
      headers: { Accept: 'application/json', 'x-shop-id': shopId },
    });
    const metaData = unwrapPayload(metaJson);
    const productSeo = normalizeSeoBlock(metaData?.seo);
    if (productSeo) seo = productSeo;
  }

  if (!seo && shopName) {
    const origin = `https://${domain}`;
    seo = normalizeSeoBlock({
      title: `${shopName} – Online Grocery`,
      description: `Order groceries online from ${shopName}.`,
      canonicalUrl: `${origin}/`,
      locale: 'en_IN',
      og: {
        type: 'website',
        image: resolveData?.shopImage || resolveData?.shop_image || '',
        imageAlt: shopName,
      },
      twitter: { card: 'summary_large_image' },
    });
  }

  return { seo, shopName, shopId };
}

function replaceTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html;
}

function upsertMetaInHtml(html, attrName, attrValue, content) {
  if (!content) return html;
  const esc = escapeHtml(content);
  const re = new RegExp(
    `<meta\\s+${attrName}=["']${attrValue}["'][^>]*>`,
    'i'
  );
  const tag = `<meta ${attrName}="${attrValue}" content="${esc}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
}

function upsertLinkInHtml(html, rel, href) {
  if (!href) return html;
  const esc = escapeHtml(href);
  const re = new RegExp(`<link\\s+rel=["']${rel}["'][^>]*>`, 'i');
  const tag = `<link rel="${rel}" href="${esc}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
}

/**
 * Inject tenant SEO into exported Next HTML (for crawlers: WhatsApp, Google, etc.).
 */
export function injectSeoIntoHtml(html, seo, options = {}) {
  if (!seo || !html) return html;

  const siteName = options.shopName || '';
  const canonical =
    seo.canonicalUrl ||
    options.canonicalUrl ||
    (options.hostname ? `https://${options.hostname}/` : '');
  const ogImage = seo.og?.image || '';
  const ogType = seo.og?.type === 'product' ? 'website' : seo.og?.type || 'website';
  const twitterCard = seo.twitter?.card || (ogImage ? 'summary_large_image' : 'summary');
  const lang = String(seo.locale || 'en_IN').replace('_', '-');

  let out = html;

  if (seo.title) {
    out = replaceTag(out, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  }
  if (seo.description) {
    out = upsertMetaInHtml(out, 'name', 'description', seo.description);
  }
  if (seo.keywords) {
    out = upsertMetaInHtml(out, 'name', 'keywords', seo.keywords);
  }
  if (siteName) {
    out = upsertMetaInHtml(out, 'property', 'og:site_name', siteName);
  }
  if (seo.title) {
    out = upsertMetaInHtml(out, 'property', 'og:title', seo.title);
    out = upsertMetaInHtml(out, 'name', 'twitter:title', seo.title);
  }
  if (seo.description) {
    out = upsertMetaInHtml(out, 'property', 'og:description', seo.description);
    out = upsertMetaInHtml(out, 'name', 'twitter:description', seo.description);
  }
  if (canonical) {
    out = upsertMetaInHtml(out, 'property', 'og:url', canonical);
    out = upsertLinkInHtml(out, 'canonical', canonical);
  }
  out = upsertMetaInHtml(out, 'property', 'og:type', ogType);
  out = upsertMetaInHtml(out, 'property', 'og:locale', seo.locale || 'en_IN');
  if (ogImage) {
    out = upsertMetaInHtml(out, 'property', 'og:image', ogImage);
    out = upsertMetaInHtml(out, 'name', 'twitter:image', ogImage);
    if (seo.og?.imageAlt) {
      out = upsertMetaInHtml(out, 'property', 'og:image:alt', seo.og.imageAlt);
    }
  }
  out = upsertMetaInHtml(out, 'name', 'twitter:card', twitterCard);
  if (seo.themeColor) {
    out = upsertMetaInHtml(out, 'name', 'theme-color', seo.themeColor);
  }
  if (ogImage) {
    out = upsertLinkInHtml(out, 'icon', ogImage);
    out = upsertLinkInHtml(out, 'apple-touch-icon', ogImage);
  }

  if (lang) {
    out = out.replace(/<html([^>]*)\slang=["'][^"']*["']/i, `<html$1 lang="${escapeHtml(lang)}"`);
    if (!/lang=/i.test(out.match(/<html[^>]*>/i)?.[0] || '')) {
      out = out.replace(/<html/i, `<html lang="${escapeHtml(lang)}"`);
    }
  }

  return out;
}

export function shouldInjectTenantSeo(url, request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const path = url.pathname || '/';
  if (path.startsWith('/api/')) return false;
  if (path.startsWith('/_next/')) return false;
  if (/\.[a-z0-9]{2,8}$/i.test(path)) return false;

  const accept = request.headers.get('Accept') || '';
  if (accept.includes('text/html')) return true;
  if (!accept || accept.includes('*/*')) return true;
  return false;
}
