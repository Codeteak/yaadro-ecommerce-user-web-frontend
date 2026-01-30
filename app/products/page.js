'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProducts, useSearchProducts, useCategories, useCategoryProducts } from '../../hooks/useProducts';
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
    inStock: null,
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

  // Load categories using TanStack Query
  const { data: categoriesData = [] } = useCategories();
  const categories = categoriesData;

  // Find selected category object
  const selectedCategoryObj = useMemo(() => {
    return categories.find(cat => cat.name === selectedCategory);
  }, [categories, selectedCategory]);

  // Load products based on category/search using TanStack Query
  const searchQueryEnabled = searchQuery && searchQuery.trim().length >= 2;
  const { data: searchData, isLoading: searchLoading } = useSearchProducts({
    q: searchQuery,
    page: 1,
    per_page: 100,
    min_price: filters.priceRange[0] || undefined,
    max_price: filters.priceRange[1] || undefined,
  });

  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useProducts({
    category_slug: selectedCategoryObj?.slug,
    page: 1,
    per_page: 100,
    min_price: filters.priceRange[0] || undefined,
    max_price: filters.priceRange[1] || undefined,
  });

  const { data: allProductsData, isLoading: allProductsLoading } = useProducts({
    page: 1,
    per_page: 100,
    min_price: filters.priceRange[0] || undefined,
    max_price: filters.priceRange[1] || undefined,
  });

  // Determine which data to use
  const productsData = useMemo(() => {
    if (searchQueryEnabled) {
      return searchData || { products: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 0 } };
    } else if (selectedCategory !== 'All' && selectedCategoryObj) {
      return categoryProductsData || { products: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 0 } };
    } else {
      return allProductsData || { products: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 0 } };
    }
  }, [searchQueryEnabled, searchData, selectedCategory, selectedCategoryObj, categoryProductsData, allProductsData]);

  const products = productsData?.products || [];
  const pagination = productsData?.pagination || { page: 1, per_page: 100, total: 0, total_pages: 0 };
  const loading = searchLoading || categoryProductsLoading || allProductsLoading;

  // Load products by category for carousels (when showing "All")
  // Note: We'll load these on demand when needed, not all at once
  const [productsByCategory, setProductsByCategory] = useState({});

  useEffect(() => {
    if (selectedCategory === 'All' && categories.length > 0) {
      async function loadCategoryProducts() {
        const grouped = {};
        for (const category of categories.slice(0, 10)) {
          try {
            const { getCategoryProducts } = await import('../../utils/productApi');
            const result = await getCategoryProducts(category.slug, { page: 1, per_page: 10 });
            grouped[category.name] = result.products || [];
          } catch (error) {
            console.error(`Error loading products for ${category.name}:`, error);
            grouped[category.name] = [];
          }
        }
        setProductsByCategory(grouped);
      }
      loadCategoryProducts();
    }
  }, [selectedCategory, categories]);

  // Apply client-side filters (brand, rating, stock, sale)
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Brand filter
    if (filters.brand) {
      const brandLower = filters.brand.toLowerCase();
      result = result.filter(product => 
        (product.brand && product.brand.toLowerCase().includes(brandLower)) ||
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
  }, [products, filters]);

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
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      case 'rating':
        return sorted.sort((a, b) => getProductRating(b) - getProductRating(a));
      case 'discount':
        return sorted.sort((a, b) => getProductDiscount(b) - getProductDiscount(a));
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

  // Get trending products (featured + high ratings)
  const trendingProducts = useMemo(() => {
    return [...products]
      .filter(p => p.isFeatured || (p.ratingsAverage && parseFloat(p.ratingsAverage) >= 4))
      .map(product => ({
        ...product,
        popularityScore: getPopularityScore(product),
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 12);
  }, [products]);

  // Get recommended products
  const recommendedProducts = useMemo(() => {
    if (selectedCategory === 'All' || !searchQuery) {
      // Show featured products from different categories
      const categoryProducts = {};
      Object.entries(productsByCategory).forEach(([cat, prods]) => {
        if (prods.length > 0) {
          categoryProducts[cat] = prods
            .filter(p => p.isFeatured)
            .sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
            .slice(0, 2);
        }
      });
      return Object.values(categoryProducts).flat().slice(0, 12);
    }
    // Show similar products from same category
    return products
      .filter(p => p.category === selectedCategory)
      .sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
      .slice(0, 12);
  }, [selectedCategory, searchQuery, products, productsByCategory]);

  // Get recently viewed products
  const recentlyViewed = useMemo(() => {
    return getRecentlyViewed(8);
  }, [getRecentlyViewed]);

  // Show filtered view if category is selected or search query exists
  const showFilteredView = selectedCategory !== 'All' || searchQuery;

  // Determine page title
  const pageTitle = useMemo(() => {
    if (!showFilteredView) return 'All Products';
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (selectedCategory !== 'All') return `${selectedCategory} Products`;
    return 'All Products';
  }, [showFilteredView, selectedCategory, searchQuery]);

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

  if (loading) {
    return (
      <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center py-12">
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Loading products...</p>
          </div>
        </Container>
      </div>
    );
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
              Showing {sortedProducts.length} of {pagination.total || products.length} products
            </div>

            {/* Products Grid */}
            {sortedProducts.length > 0 ? (
              <ProductGrid products={sortedProducts} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No products found matching your filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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
              {categories.slice(0, 10).map((category) => {
                const categoryProducts = productsByCategory[category.name] || [];
                if (categoryProducts.length === 0) return null;
                
                return (
                  <div key={category.id} className="w-full max-w-full overflow-x-hidden">
                    <ProductCarousel
                      products={categoryProducts}
                      title={category.name}
                      showMoreLink={`/products?category=${encodeURIComponent(category.name)}`}
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
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Loading products...</p>
          </div>
        </Container>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
