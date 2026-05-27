/**
 * Cloudflare Pages Function — proxy /api/* to the Yaadro customer API.
 *
 * Static export cannot use Next.js rewrites. Custom domains (e.g. marketfresh.in)
 * call customer.yaadro.online in env; without this proxy, httpOnly serviceability
 * cookies from POST /storefront/location/check are cross-site and checkout gets 403.
 *
 * Set API_ORIGIN in Pages → Settings → Environment variables (optional).
 */

const DEFAULT_API_ORIGIN = 'https://customer.yaadro.online';

function apiOriginFromEnv(env) {
  const raw = env?.API_ORIGIN || env?.NEXT_PUBLIC_API_URL || DEFAULT_API_ORIGIN;
  return String(raw).trim().replace(/\/+$/, '');
}

/** Drop Domain=… so the browser stores cookies on the shop host (marketfresh.in). */
function rewriteSetCookieHeader(value) {
  if (!value) return value;
  return value
    .replace(/;\s*Domain=[^;]*/gi, '')
    .replace(/;\s*SameSite=[^;]*/gi, '; SameSite=Lax');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = apiOriginFromEnv(env);
  const target = `${origin}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Host', new URL(origin).host);

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const upstream = await fetch(target, init);
  const outHeaders = new Headers(upstream.headers);

  if (typeof upstream.headers.getSetCookie === 'function') {
    outHeaders.delete('set-cookie');
    for (const cookie of upstream.headers.getSetCookie()) {
      outHeaders.append('Set-Cookie', rewriteSetCookieHeader(cookie));
    }
  } else {
    const single = upstream.headers.get('set-cookie');
    if (single) {
      outHeaders.set('Set-Cookie', rewriteSetCookieHeader(single));
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
