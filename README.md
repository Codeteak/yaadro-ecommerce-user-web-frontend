# Yaadro storefront

One welcome page. Build the grocery app from `src/app/page.tsx`.

```
npm run dev
```

## Shop API

Customer calls go through `src/lib/api/client.ts`. Domain helpers live next to it (`auth`, `profile`, `address`, `checkout`, `customer-orders`, `shop-coupons`, `cart`). Catalog reads in `storefront.ts` use the same client.

- Base URL is `NEXT_PUBLIC_API_URL`. Shop id is `NEXT_PUBLIC_SHOP_ID` (`x-shop-id`). Timeout is `NEXT_PUBLIC_API_TIMEOUT_MS`.
- Every call sends `X-Request-ID`. Signed-in calls send `Authorization: Bearer`. The access token stays in memory. The refresh token stays in `sessionStorage` for this tab, because the API returns tokens in JSON and the browser cannot set an httpOnly cookie. Logout in one tab clears the others via a non-secret storage flag. A 401 refreshes once, then replays the call. If refresh fails, the shopper returns to `/login?next=`.
- Errors become `{ status, code, message, details, requestId }`. Shopper copy is in `src/lib/api/errors.ts`. GET calls retry on network errors, 408, 429, and 5xx. Checkout is not retried; it sends `Idempotency-Key`.
- Server cart item routes return 410. The basket stays on the device. Checkout sends those lines and the shop prices them.
- Wishlist has no shop endpoint, so it stays on this device.
- Catalog cache invalidation uses a server secret and is not called from the browser.

To add an endpoint: add a typed function beside the matching domain file, call `request()`, and read it with TanStack Query if a screen shows the data. Map failures through `ApiError` instead of a new toast style.

## Component playground (dev only)

While developing, open [http://localhost:3000/playground](http://localhost:3000/playground) to review built storefront components and planned ecom UI stubs before wiring them into live routes. The playground **404s in production** (`NODE_ENV=production`).
