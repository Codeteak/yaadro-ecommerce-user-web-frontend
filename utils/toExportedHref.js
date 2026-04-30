export function toExportedHref(href) {
  const enabled =
    typeof process !== 'undefined' &&
    process?.env?.NEXT_PUBLIC_STATIC_HTML_ROUTES === '1';

  if (!enabled) return href;
  if (typeof href !== 'string') return href;

  // leave external/protocol URLs untouched
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) return href;
  if (!href.startsWith('/')) return href;
  if (href === '/') return href;

  // split hash + query
  const [beforeHash, hash = ''] = href.split('#');
  const [pathRaw, query = ''] = beforeHash.split('?');

  // normalize
  const path = pathRaw.replace(/\/+$/, '');

  // if already has an extension (".html", ".png", etc), keep as-is
  const last = path.split('/').pop() || '';
  if (last.includes('.') && !last.startsWith('.')) {
    return `${path}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  }

  const next = `${path}.html${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  return next;
}

