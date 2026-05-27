import { getApiOrigin } from './apiClient';

function registrableDomain(hostname) {
  const host = String(hostname || '').toLowerCase().trim();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join('.');
}

/**
 * Whether the storefront page and API host can share SameSite cookies (e.g. Lax).
 * Different registrable domains (shop on marketfresh.in, API on yaadro.online) often
 * block the httpOnly `storefront_serviceability` cookie → checkout 403 SERVICE_AREA.
 */
export function getStorefrontCookieSiteDiagnostics() {
  if (typeof window === 'undefined') return null;

  const pageHost = window.location.hostname.toLowerCase();
  let apiHost = '';
  try {
    apiHost = new URL(getApiOrigin()).hostname.toLowerCase();
  } catch {
    return null;
  }

  const pageDomain = registrableDomain(pageHost);
  const apiDomain = registrableDomain(apiHost);
  const sameHost = pageHost === apiHost;
  const sameSite = sameHost || (pageDomain && pageDomain === apiDomain);

  return {
    pageHost,
    apiHost,
    pageDomain,
    apiDomain,
    sameHost,
    sameSite,
    crossSite: !sameSite,
  };
}

export function getStorefrontCookieSiteWarning() {
  const d = getStorefrontCookieSiteDiagnostics();
  if (!d || d.sameSite) return null;
  return (
    `Delivery verification cookies may not work between "${d.pageHost}" and "${d.apiHost}" ` +
    `(different sites). Use a shop URL on the same domain as the API, or ask backend to enable cross-site cookies.`
  );
}
