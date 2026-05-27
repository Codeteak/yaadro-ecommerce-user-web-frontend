/**
 * Cloudflare Pages middleware — per-tenant SEO in static HTML.
 *
 * Static export (`output: 'export'`) bakes one <head> at build time. Crawlers
 * (WhatsApp, Facebook, Google) do not run React, so we rewrite meta tags here
 * using GET /api/shops/resolve-by-domain and GET /api/seo/metadata.
 */

import {
  injectSeoIntoHtml,
  resolveTenantSeo,
  shouldInjectTenantSeo,
} from './lib/tenantSeo.js';

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (!shouldInjectTenantSeo(url, request)) {
    return next();
  }

  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  try {
    const { seo, shopName } = await resolveTenantSeo(url.hostname, url.pathname, env);
    if (!seo) return response;

    const html = await response.text();
    const rewritten = injectSeoIntoHtml(html, seo, {
      shopName,
      hostname: url.hostname,
      canonicalUrl: seo.canonicalUrl || `https://${url.hostname}/`,
    });

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.delete('content-length');
    headers.set('x-tenant-seo', '1');

    return new Response(rewritten, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error('[tenant-seo]', url.hostname, url.pathname, err);
    return response;
  }
}
