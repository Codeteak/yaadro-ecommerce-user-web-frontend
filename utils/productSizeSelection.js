/**
 * Size/weight options for product cards and PDP.
 * Keeps selected variant in sync with live catalog price updates.
 */

/** @param {object | null | undefined} product */
export function buildAvailableSizes(product) {
  if (!product || typeof product !== 'object') return [];
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes;
  }
  if (product.weight && product.unit) {
    return [
      {
        weight: product.weight,
        unit: product.unit,
        price: parseFloat(product.price) || 0,
      },
    ];
  }
  return [];
}

/**
 * Map user-selected size onto the latest `availableSizes` (fresh prices from refetch).
 * @param {Array<object>} availableSizes
 * @param {object | null | undefined} selectedSize
 */
export function resolveSelectedSize(availableSizes, selectedSize) {
  if (!Array.isArray(availableSizes) || availableSizes.length === 0) return null;
  if (!selectedSize) return availableSizes[0];
  const match = availableSizes.find(
    (s) =>
      String(s.weight ?? '') === String(selectedSize.weight ?? '') &&
      String(s.unit ?? '') === String(selectedSize.unit ?? '')
  );
  return match ?? availableSizes[0];
}
