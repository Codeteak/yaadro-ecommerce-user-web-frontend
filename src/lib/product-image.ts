/** Shown on a product card or detail gallery when the catalog has no photo. */
export const PRODUCT_IMAGE_FALLBACK = "/products/no-image.jpg";

export function productPhoto(src: string | null | undefined): string {
  const trimmed = src?.trim();
  return trimmed ? trimmed : PRODUCT_IMAGE_FALLBACK;
}

export function isProductImageFallback(src: string): boolean {
  return src === PRODUCT_IMAGE_FALLBACK;
}
