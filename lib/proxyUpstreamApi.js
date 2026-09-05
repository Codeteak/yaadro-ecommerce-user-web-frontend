/**
 * When DATABASE_URL is unset, forward storefront catalog GETs to the real backend.
 */

function getUpstreamOrigin() {
  const raw =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://customer.yaadro.online';
  return String(raw).trim().replace(/\/+$/, '');
}

/**
 * @param {Request} request
 * @param {string} upstreamPath - e.g. `/api/storefront/products`
 */
export async function proxyUpstreamGet(request, upstreamPath) {
  const incoming = new URL(request.url);
  const target = new URL(`${getUpstreamOrigin()}${upstreamPath}`);
  target.search = incoming.search;

  const headers = new Headers();
  const shopId = request.headers.get('x-shop-id');
  const auth = request.headers.get('authorization');
  const accept = request.headers.get('accept');
  if (shopId) headers.set('x-shop-id', shopId);
  if (auth) headers.set('authorization', auth);
  if (accept) headers.set('accept', accept);
  else headers.set('accept', 'application/json');
  // Free ngrok returns ERR_NGROK_6024 for browser User-Agents; this fetch has no UA.
  headers.set('ngrok-skip-browser-warning', '1');

  const upstream = await fetch(target.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}
