/** Shown when a category has no photo. */
export const CATEGORY_IMAGE_FALLBACK = "/categories/no-image.png";

export function isCategoryImageFallback(src: string): boolean {
  return src === CATEGORY_IMAGE_FALLBACK;
}
