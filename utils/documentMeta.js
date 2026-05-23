/** Insert or update a `<meta>` tag in `document.head` (client only). */
export function upsertMeta(attrName, attrValue, content) {
  if (typeof document === 'undefined' || !content) return;
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Insert or update a `<link rel="…">` in `document.head` (client only). */
export function upsertLink(rel, href) {
  if (typeof document === 'undefined' || !href) return;
  const selector = `link[rel="${rel}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}
