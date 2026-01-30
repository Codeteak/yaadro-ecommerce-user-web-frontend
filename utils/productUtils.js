// Utility functions for product operations

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

// Get discount percentage from API data or calculate
export function getProductDiscount(product) {
  // Use API discountPercentage if available
  if (product.discountPercentage !== undefined && product.discountPercentage !== null) {
    return parseFloat(product.discountPercentage) || 0;
  }
  // Calculate from compareAtPrice/originalPrice if available
  if (product.originalPrice && product.price) {
    const original = parseFloat(product.originalPrice);
    const current = parseFloat(product.price);
    if (original > current) {
      return Math.round(((original - current) / original) * 100);
    }
  }
  // Fallback: Generate mock discount (for backward compatibility)
  if (typeof product.id === 'number' && product.id % 3 === 0) {
    const seed = product.id * 11;
    return 10 + (seed % 30); // Discount between 10% and 40%
  }
  return 0;
}

// Calculate discounted price
export function getDiscountedPrice(product) {
  // If originalPrice exists, use it for calculation
  if (product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price)) {
    return parseFloat(product.price);
  }
  // Otherwise calculate from discount percentage
  const discount = getProductDiscount(product);
  if (discount > 0) {
    return Math.round(parseFloat(product.price) * (1 - discount / 100));
  }
  return parseFloat(product.price) || 0;
}

// Check if product is on sale
export function isOnSale(product) {
  return getProductDiscount(product) > 0 || (product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price));
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


