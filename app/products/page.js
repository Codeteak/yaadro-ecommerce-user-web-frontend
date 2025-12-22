'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { products } from '../../data/products';
import { getProductsByCategory, searchProducts } from '../../data/products';
import ProductGrid from '../../components/ProductGrid';
import ProductCarousel from '../../components/ProductCarousel';
import ProductFilters from '../../components/ProductFilters';
import ProductSort from '../../components/ProductSort';
import Container from '../../components/Container';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useRecentlyViewed } from '../../context/RecentlyViewedContext';
import { 
  getProductRating, 
  getProductDiscount, 
  getDiscountedPrice, 
  isOnSale, 
  getPopularityScore,
  getBrands 
} from '../../utils/productUtils';

const categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat & Seafood', 'Bakery', 'Beverages', 'Snacks', 'Pantry', 'Frozen', 'Baby Care', 'Personal Care', 'Cleaning', 'Home & Kitchen', 'Health & Wellness', 'Spices & Condiments'];

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category');
  const searchParam = searchParams?.get('search');
  const { getRecentlyViewed } = useRecentlyViewed();
  
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [sortBy, setSortBy] = useState('default');
  const [filters, setFilters] = useState({
    priceRange: [0, 10000],
    brand: '',
    rating: 0,
    inStock: null, // null = all, true = in stock, false = out of stock
    onSale: false,
  });

  // Update selected category and search query when URL params change
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('All');
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }
  }, [categoryParam, searchParam]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped = {};
    categories.forEach(category => {
      const categoryProducts = getProductsByCategory(category);
      grouped[category] = categoryProducts.slice(0, 10);
    });
    return grouped;
  }, []);

  // Get base products based on category and search
  const baseProducts = useMemo(() => {
    let result;
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      const matchingCategory = categories.find(cat => 
        cat.toLowerCase() === lowerQuery || cat.toLowerCase().includes(lowerQuery)
      );
      
      if (matchingCategory) {
        result = getProductsByCategory(matchingCategory);
      } else {
        result = searchProducts(searchQuery);
        if (selectedCategory !== 'All') {
          result = result.filter(product => product.category === selectedCategory);
        }
      }
    } else {
      result = selectedCategory === 'All' ? products : getProductsByCategory(selectedCategory);
    }
    
    return result;
  }, [selectedCategory, searchQuery]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    let result = [...baseProducts];

    // Price range filter
    result = result.filter(product => {
      const price = getDiscountedPrice(product);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Brand filter
    if (filters.brand) {
      const brandLower = filters.brand.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(brandLower)
      );
    }

    // Rating filter
    if (filters.rating > 0) {
      result = result.filter(product => getProductRating(product) >= filters.rating);
    }

    // Stock availability filter
    if (filters.inStock !== null) {
      result = result.filter(product => product.inStock === filters.inStock);
    }

    // Discount/sale filter
    if (filters.onSale) {
      result = result.filter(product => isOnSale(product));
    }

    return result;
  }, [baseProducts, filters]);

  // Apply sorting
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => getDiscountedPrice(a) - getDiscountedPrice(b));
      case 'price-high':
        return sorted.sort((a, b) => getDiscountedPrice(b) - getDiscountedPrice(a));
      case 'popularity':
        return sorted.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
      case 'newest':
        return sorted.sort((a, b) => b.id - a.id); // Higher ID = newer
      case 'rating':
        return sorted.sort((a, b) => getProductRating(b) - getProductRating(a));
      case 'discount':
        return sorted.sort((a, b) => getProductDiscount(b) - getProductDiscount(a));
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

  // Get trending products (based on popularity and recent views)
  const trendingProducts = useMemo(() => {
    const allProducts = [...products];
    return allProducts
      .map(product => ({
        ...product,
        popularityScore: getPopularityScore(product),
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 12);
  }, []);

  // Get recommended products (based on category and price similarity)
  const recommendedProducts = useMemo(() => {
    if (selectedCategory === 'All' || !searchQuery) {
      // Show popular products from different categories
      const categoryProducts = {};
      categories.forEach(cat => {
        const catProducts = getProductsByCategory(cat);
        if (catProducts.length > 0) {
          categoryProducts[cat] = catProducts
            .sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
            .slice(0, 2);
        }
      });
      return Object.values(categoryProducts).flat().slice(0, 12);
    }
    // Show similar products from same category
    const categoryProducts = getProductsByCategory(selectedCategory);
    return categoryProducts
      .sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
      .slice(0, 12);
  }, [selectedCategory, searchQuery]);

  // Get recently viewed products
  const recentlyViewed = useMemo(() => {
    return getRecentlyViewed(8);
  }, [getRecentlyViewed]);

  // Check if search query matches a category
  const matchedCategory = useMemo(() => {
    if (!searchQuery) return null;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return categories.find(cat => 
      cat.toLowerCase() === lowerQuery || cat.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery]);

  // Show filtered view if category is selected or search query exists
  const showFilteredView = selectedCategory !== 'All' || searchQuery;

  // Determine page title
  const pageTitle = useMemo(() => {
    if (!showFilteredView) return 'All Products';
    if (matchedCategory) return `${matchedCategory} Products`;
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (selectedCategory !== 'All') return `${selectedCategory} Products`;
    return 'All Products';
  }, [showFilteredView, matchedCategory, selectedCategory, searchQuery]);

  const handleClearFilters = () => {
    setFilters({
      priceRange: [0, 10000],
      brand: '',
      rating: 0,
      inStock: null,
      onSale: false,
    });
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
  ];
  
  if (selectedCategory !== 'All') {
    breadcrumbItems.push({ label: selectedCategory, href: `/products?category=${encodeURIComponent(selectedCategory)}` });
  }

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          {pageTitle}
        </h1>

        {/* Show filtered products if category/search is active */}
        {showFilteredView ? (
          <div className="px-4 md:px-0">
            {/* Filters and Sort */}
            <div className="mb-6 space-y-4">
              <ProductFilters 
                filters={filters} 
                onFilterChange={setFilters}
                onClearFilters={handleClearFilters}
              />
              <ProductSort sortBy={sortBy} onSortChange={setSortBy} />
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {sortedProducts.length} of {baseProducts.length} products
            </div>

            {/* Products Grid */}
            {sortedProducts.length > 0 ? (
              <ProductGrid products={sortedProducts} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No products found matching your filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Recommended for You</h2>
                <ProductCarousel products={recommendedProducts} />
              </div>
            )}
          </div>
        ) : (
          /* Show category carousels with additional sections */
          <div className="space-y-8 md:space-y-12">
            {/* Trending Products */}
            {trendingProducts.length > 0 && (
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">🔥 Trending Products</h2>
                </div>
                <ProductCarousel products={trendingProducts} />
              </div>
            )}

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">👁️ Recently Viewed</h2>
                </div>
                <ProductCarousel products={recentlyViewed} />
              </div>
            )}

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">⭐ Recommended for You</h2>
                </div>
                <ProductCarousel products={recommendedProducts} />
              </div>
            )}

            {/* Category carousels */}
            <div className="space-y-4 md:space-y-6 -mr-4 sm:-mr-6 lg:-mr-8">
              {categories.map((category) => {
                const categoryProducts = productsByCategory[category];
                if (!categoryProducts || categoryProducts.length === 0) return null;
                
                return (
                  <div key={category} className="w-full max-w-full overflow-x-hidden">
                    <ProductCarousel
                      products={categoryProducts}
                      title={category}
                      showMoreLink={`/products?category=${encodeURIComponent(category)}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Loading products...</p>
          </div>
        </Container>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
