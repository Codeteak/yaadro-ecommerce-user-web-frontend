const FAVICON_RELS = new Set(['icon', 'shortcut icon', 'apple-touch-icon']);

export function normalizeShopImageUrl(imageUrl) {
  const href = imageUrl != null ? String(imageUrl).trim() : '';
  return href || '';
}

/** Shop logo links for the tab and home-screen icon. Null keeps the built-in fallback. */
export function faviconLinksForShop(imageUrl) {
  const href = normalizeShopImageUrl(imageUrl);
  if (!href) return null;
  return [
    { rel: 'icon', href },
    { rel: 'apple-touch-icon', href },
  ];
}

export function isFaviconLinkRel(rel) {
  return FAVICON_RELS.has(String(rel || '').trim().toLowerCase());
}

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace every icon link with the shop image.
 * A missing image leaves the existing fallback icons in place.
 */
export function replaceFaviconLinksInHtml(html, imageUrl) {
  const links = faviconLinksForShop(imageUrl);
  if (!links || !html) return html;
  const stripped = String(html).replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    return isFaviconLinkRel(rel) ? '' : tag;
  });
  const tags = links
    .map((link) => `<link rel="${link.rel}" href="${escapeHtmlAttr(link.href)}">`)
    .join('');
  if (/<head\b[^>]*>/i.test(stripped)) {
    return stripped.replace(/<head\b([^>]*)>/i, `<head$1>${tags}`);
  }
  return `${tags}${stripped}`;
}

/** Client: drop the shared fallback icons and use this shop's image. */
export function applyShopFavicon(doc, imageUrl) {
  const links = faviconLinksForShop(imageUrl);
  if (!links || !doc?.head || typeof doc.createElement !== 'function') return false;
  const existing = doc.head.querySelectorAll?.(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );
  if (existing) {
    for (const el of existing) {
      el.remove?.();
    }
  }
  for (const link of links) {
    const el = doc.createElement('link');
    el.setAttribute('rel', link.rel);
    el.setAttribute('href', link.href);
    doc.head.appendChild(el);
  }
  return true;
}
