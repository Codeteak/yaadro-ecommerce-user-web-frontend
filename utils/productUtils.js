// Utility functions for product operations

/**
 * Storefront catalog: `price` = MRP (list), `offerPrice` = what customer pays when on sale.
 * Legacy: `originalPrice` > `price` means `price` is already the sale price.
 */
export function hasActiveOffer(product) {
  if (!product || typeof product !== 'object') return false;
  const list = parseFloat(product.price);
  if (!Number.isFinite(list) || list <= 0) return false;
  if (product.offerPrice == null && product.offerPriceEffective == null) return false;
  const off = parseFloat(product.offerPrice ?? product.offerPriceEffective);
  return Number.isFinite(off) && off > 0 && off < list;
}

/** MRP / strikethrough amount (list price). */
export function getListPrice(product) {
  if (!product) return 0;
  const list = parseFloat(product.price);
  if (!Number.isFinite(list)) return 0;
  const op = product.originalPrice != null ? parseFloat(product.originalPrice) : null;
  if (op != null && Number.isFinite(op) && op > list) return op;
  return list;
}

/**
 * Unit price the customer pays (offer/sale), never integer-rounded away from paise.
 * @param {object} product
 * @param {number} [unitListPrice] — when variants/sizes use a different list than `product.price`, pass that list; offer is scaled by list ratio.
 */
export function getEffectivePrice(product, unitListPrice) {
  if (!product || typeof product !== 'object') return 0;
  const baseList = parseFloat(product.price);
  const list =
    unitListPrice !== undefined && Number.isFinite(parseFloat(unitListPrice))
      ? parseFloat(unitListPrice)
      : baseList;
  if (!Number.isFinite(list) || list <= 0) return 0;

  const offRaw = product.offerPrice ?? product.offerPriceEffective;
  if (offRaw != null) {
    const off = parseFloat(offRaw);
    if (Number.isFinite(off) && off > 0 && off < baseList && baseList > 0) {
      return (list / baseList) * off;
    }
  }

  const op = product.originalPrice != null ? parseFloat(product.originalPrice) : null;
  if (op != null && Number.isFinite(op) && op > list) {
    return list;
  }

  const discount = getProductDiscount(product);
  if (discount > 0) {
    const raw = list * (1 - discount / 100);
    return Math.round(raw * 100) / 100;
  }
  return list;
}

/** Format rupees: keeps paise when needed (e.g. 3.99), no forced integer. */
export function formatRupeeINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// Get product rating from API data or generate mock
export function getProductRating(product) {
  // Use API rating if available
  if (product.ratingsAverage !== undefined && product.ratingsAverage !== null) {
    return parseFloat(product.ratingsAverage) || 0;
  }
  // Fallback: Generate consistent rating based on product ID (for backward compatibility)
  if (typeof product.id === 'number') {
    const seed = product.id * 7;
    const rating = 3 + (seed % 20) / 10; // Rating between 3.0 and 4.9
    return Math.round(rating * 10) / 10;
  }
  return 0;
}

// Get discount percentage from API data or calculate (float; avoid rounding small offers to 0%)
export function getProductDiscount(product) {
  if (product.discountPercentage !== undefined && product.discountPercentage !== null) {
    const d = parseFloat(product.discountPercentage);
    if (Number.isFinite(d) && d > 0) return d;
  }
  const list = parseFloat(product.price);
  const off = product.offerPrice ?? product.offerPriceEffective;
  if (Number.isFinite(list) && list > 0 && off != null) {
    const offer = parseFloat(off);
    if (Number.isFinite(offer) && offer > 0 && offer < list) {
      return ((list - offer) / list) * 100;
    }
  }
  if (product.originalPrice && product.price) {
    const original = parseFloat(product.originalPrice);
    const current = parseFloat(product.price);
    if (original > current) {
      return ((original - current) / original) * 100;
    }
  }
  if (typeof product.id === 'number' && product.id % 3 === 0) {
    const seed = product.id * 11;
    return 10 + (seed % 30);
  }
  return 0;
}

// Calculate discounted price — prefer explicit offerPrice; never round to whole rupees.
export function getDiscountedPrice(product) {
  return getEffectivePrice(product);
}

// Check if product is on sale
export function isOnSale(product) {
  return (
    hasActiveOffer(product) ||
    getProductDiscount(product) > 0 ||
    (product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price))
  );
}

// Get product popularity score (based on ratings, views, sales, etc.)
export function getPopularityScore(product) {
  // Use ratings count and average as popularity indicator
  const ratingScore = (product.ratingsCount || 0) * (product.ratingsAverage || 0);
  const featuredBonus = product.isFeatured ? 100 : 0;
  const priceFactor = parseFloat(product.price) < 200 ? 1.5 : 1;
  
  // Fallback for numeric IDs (backward compatibility)
  if (typeof product.id === 'number') {
    const baseScore = 1000 - product.id;
    return baseScore * priceFactor;
  }
  
  return (ratingScore + featuredBonus) * priceFactor;
}

// Get brands from products (extract from product names or use mock)
export function getBrands(products) {
  const brandSet = new Set();
  products.forEach(product => {
    // Extract brand from name (first word if it looks like a brand)
    const words = product.name.split(' ');
    if (words[0] && words[0].length > 2) {
      brandSet.add(words[0]);
    }
  });
  return Array.from(brandSet).sort();
}


