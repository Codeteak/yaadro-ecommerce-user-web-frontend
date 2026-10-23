export const PG_LAST_SLUG_KEY = "yaadro-playground-last-slug";
export const PG_CATALOG_SCROLL_KEY = "yaadro-playground-catalog-scroll-y";
export const PG_ASIDE_SCROLL_KEY = "yaadro-playground-aside-scroll-top";

export function setPlaygroundLastSlug(slug: string) {
  try {
    sessionStorage.setItem(PG_LAST_SLUG_KEY, slug);
  } catch {
    // ignore
  }
}

export function getPlaygroundLastSlug(): string | null {
  try {
    return sessionStorage.getItem(PG_LAST_SLUG_KEY);
  } catch {
    return null;
  }
}

export function setCatalogScrollY(y: number) {
  try {
    sessionStorage.setItem(PG_CATALOG_SCROLL_KEY, String(Math.round(y)));
  } catch {
    // ignore
  }
}

export function getCatalogScrollY(): number | null {
  try {
    const raw = sessionStorage.getItem(PG_CATALOG_SCROLL_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setAsideScrollTop(y: number) {
  try {
    sessionStorage.setItem(PG_ASIDE_SCROLL_KEY, String(Math.round(y)));
  } catch {
    // ignore
  }
}

export function getAsideScrollTop(): number | null {
  try {
    const raw = sessionStorage.getItem(PG_ASIDE_SCROLL_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
