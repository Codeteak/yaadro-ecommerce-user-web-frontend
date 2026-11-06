import { connection } from "next/server";

/**
 * Root metadata reads the request host (`headers()`) to name the shop.
 * With Cache Components, a page that is otherwise static — `/cart` is —
 * must show that this runtime metadata is intentional. `connection()`
 * inside `<Suspense>` does that without pulling page content out of the
 * prerendered shell.
 */
export async function ShopMetadataMarker() {
  await connection();
  return null;
}
