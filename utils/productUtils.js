// Utility functions for product operations

// Generate mock rating (for demo purposes)
export function getProductRating(product) {
  // Generate consistent rating based on product ID
  const seed = product.id * 7;
  const rating = 3 + (seed % 20) / 10; // Rating between 3.0 and 4.9
  return Math.round(rating * 10) / 10;
}

// Generate mock discount percentage
export function getProductDiscount(product) {
  // Some products have discounts
  if (product.id % 3 === 0) {
    const seed = product.id * 11;
    return 10 + (seed % 30); // Discount between 10% and 40%
  }
  return 0;
}

// Calculate discounted price
export function getDiscountedPrice(product) {
  const discount = getProductDiscount(product);
  if (discount > 0) {
    return Math.round(product.price * (1 - discount / 100));
  }
  return product.price;
}

// Check if product is on sale
export function isOnSale(product) {
  return getProductDiscount(product) > 0;
}

// Get product popularity score (mock - based on views, sales, etc.)
export function getPopularityScore(product) {
  // Mock popularity based on product ID and price
  const baseScore = 1000 - product.id;
  const priceFactor = product.price < 200 ? 1.5 : 1;
  return baseScore * priceFactor;
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


