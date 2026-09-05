import { NextResponse } from 'next/server';

/**
 * Free ngrok interstitials (ERR_NGROK_6024) when the browser UA is forwarded
 * through the /api rewrite. Tag every API request so the upstream proxy can skip it.
 */
export function middleware(request) {
  const headers = new Headers(request.headers);
  headers.set('ngrok-skip-browser-warning', '1');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
