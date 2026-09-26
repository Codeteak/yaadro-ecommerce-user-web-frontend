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

/**
 * Client: apply shop image as favicon without removeChild on Next-managed <link>s.
 * Removing React-owned head nodes races metadata updates and throws removeChild null.
 */
export function applyShopFavicon(doc, imageUrl) {
  const links = faviconLinksForShop(imageUrl);
  if (!links || !doc?.head || typeof doc.createElement !== 'function') return false;

  for (const link of links) {
    const marker = link.rel;
    let el = doc.head.querySelector?.(
      `link[data-yaadro-shop-favicon="${marker}"]`
    );
    if (!el) {
      el = doc.createElement('link');
      el.setAttribute('data-yaadro-shop-favicon', marker);
      el.setAttribute('rel', link.rel);
      doc.head.appendChild(el);
    }
    el.setAttribute('href', link.href);
    el.removeAttribute('media');
  }

  // Soft-disable built-in icons (do not remove — Next may still own those nodes).
  const existing = doc.head.querySelectorAll?.(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );
  if (existing) {
    for (const el of existing) {
      if (el.hasAttribute('data-yaadro-shop-favicon')) continue;
      el.setAttribute('data-yaadro-favicon-suppressed', '1');
      el.setAttribute('media', 'not all');
    }
  }
  return true;
}
