/**
 * Bottom-nav / route active matching.
 * Home (`/`) is exact-only; other tabs match themselves and nested paths.
 */
export function pathIsActive(pathname, href) {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  const target = href.replace(/\/+$/, '') || '/';
  if (target === '/') return path === '/';
  return path === target || path.startsWith(`${target}/`);
}
