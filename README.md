# Yaadro storefront

One welcome page. Build the grocery app from `src/app/page.tsx`.

```
npm run dev
```

## Shop API

Customer calls for login, profile, address, coupons, orders, and checkout go through `src/lib/api/client.ts`. Catalog reads (categories, products, product detail, home shelves) run on this server against `DATABASE_URL`. The delivery screen previews the shop radius from the same database. Place Order still calls `POST /api/storefront/location/check` so the shop can sign the delivery cookie.

- Base URL is `NEXT_PUBLIC_API_URL`. Timeout is `NEXT_PUBLIC_API_TIMEOUT_MS`.
- Multi-shop: production resolves `shop_id` from the request hostname (`/api/shops/resolve-by-domain`). `NEXT_PUBLIC_DEFAULT_SHOP_ID` is the local/fallback UUID only (legacy alias: `NEXT_PUBLIC_SHOP_ID`). Client API calls send `x-shop-id` from the resolved shop (or that default).
- `DATABASE_URL` and `OBJECT_STORAGE_PUBLIC_BASE_URL` are server-only. Do not prefix them with `NEXT_PUBLIC_`.
- Every API call sends `X-Request-ID`. Signed-in calls send `Authorization: Bearer`. The access token stays in memory. The refresh token stays in `sessionStorage` for this tab, because the API returns tokens in JSON and the browser cannot set an httpOnly cookie. Logout in one tab clears the others via a non-secret storage flag. A 401 refreshes once, then replays the call. If refresh fails, the shopper returns to `/login?next=`.
- Errors become `{ status, code, message, details, requestId }`. Shopper copy is in `src/lib/api/errors.ts`. GET calls retry on network errors, 408, 429, and 5xx. Checkout is not retried; it sends `Idempotency-Key`.
- Server cart item routes return 410. The basket stays on the device. Checkout shows a radius preview from the database when the address already has a pin, then asks the shop API before the order is sent.
- Wishlist has no shop endpoint, so it stays on this device.
- Catalog cache invalidation uses a server secret and is not called from the browser.

To add an endpoint: add a typed function beside the matching domain file, call `request()`, and read it with TanStack Query if a screen shows the data. Map failures through `ApiError` instead of a new toast style.

## Component playground (dev only)

While developing, open [http://localhost:3000/playground](http://localhost:3000/playground) to review built storefront components and planned ecom UI stubs before wiring them into live routes. The playground **404s in production** (`NODE_ENV=production`).
