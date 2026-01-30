'use client';

import { useEffect, useState } from 'react';
import Container from './Container';
import Link from 'next/link';
import { getCategories, getProductsByCategory } from '../utils/productApi';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [categories, setCategories] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);

  // Load categories and popular products
  useEffect(() => {
    async function loadData() {
      try {
        const cats = await getCategories();
        setCategories(cats.filter(cat => cat.isActive && cat.level === 0));

        // Load popular products (featured or high ratings)
        const popular = [];
        for (const cat of cats.slice(0, 5)) {
          try {
            const products = await getProductsByCategory(cat.name, 3);
            popular.push(...products.map(p => p.name));
          } catch (error) {
            console.error(`Error loading products for ${cat.name}:`, error);
          }
        }
        setPopularProducts(popular.slice(0, 16));
      } catch (error) {
        console.error('Error loading footer data:', error);
      }
    }
    loadData();
  }, []);

  const popularSearches = {
    products: popularProducts,
    brands: ['Yakult', 'My Muse', 'Aashirvaad Atta', 'Too Yumm', 'Lays', 'Figaro Olive Oil', 'Nandini Milk', 'Amul', 'Mother Dairy Near Me', 'Fortune Oil', 'Superyou', 'Durex Condoms', 'Ferns and Petals'],
    categories: categories.slice(0, 13).map(cat => cat.name),
  };

  // Map footer categories to actual product categories
  const categoryMapping = {
    'Fruits & Vegetables': ['Fruits', 'Vegetables'],
    'Baby Food': ['Baby Care'],
    'Breakfast & Sauces': ['Pantry'],
    'Cleaning Essentials': ['Cleaning'],
    'Atta, Rice, Oil & Dals': ['Pantry'],
    'Dairy, Bread & Eggs': ['Dairy', 'Bakery'],
    'Tea, Coffee & More': ['Beverages'],
    'Masala & Dry Fruits': ['Spices & Condiments'],
    'Cold Drinks & Juices': ['Beverages'],
    'Biscuits': ['Snacks'],
    'Sweet Cravings': ['Snacks', 'Bakery'],
    'Munchies': ['Snacks'],
    'Frozen Food & Ice Creams': ['Frozen'],
    'Meats, Fish & Eggs': ['Meat & Seafood'],
    'Bath & Body': ['Personal Care'],
    'Health & Baby Care': ['Health & Wellness', 'Baby Care'],
    'Makeup & Beauty': ['Personal Care'],
    'Hygiene & Grooming': ['Personal Care'],
  };

  const footerCategories = [
    ['Fruits & Vegetables', 'Baby Food', 'Breakfast & Sauces', 'Cleaning Essentials'],
    ['Atta, Rice, Oil & Dals', 'Dairy, Bread & Eggs', 'Tea, Coffee & More'],
    ['Masala & Dry Fruits', 'Cold Drinks & Juices', 'Biscuits'],
    ['Sweet Cravings', 'Munchies', 'Makeup & Beauty', 'Hygiene & Grooming'],
    ['Frozen Food & Ice Creams', 'Meats, Fish & Eggs', 'Bath & Body', 'Health & Baby Care'],
  ];

  // Get products for each footer category
  const getCategoryProducts = async (footerCategory) => {
    const mappedCategories = categoryMapping[footerCategory] || [];
    const allProducts = [];
    for (const cat of mappedCategories) {
      try {
        const products = await getProductsByCategory(cat, 5);
        allProducts.push(...products);
      } catch (error) {
        console.error(`Error loading products for ${cat}:`, error);
      }
    }
    // Remove duplicates and return first 5 products
    const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());
    return uniqueProducts.slice(0, 5);
  };

  const companyLinks = [
    { label: 'Home', href: '/' },
    { label: 'Delivery Areas', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Customer Support', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Mojo - a Yaadro Blog', href: '#' },
  ];

  const policyLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Use', href: '#' },
    { label: 'Responsible Disclosure Policy', href: '#' },
    { label: 'Sell on Yaadro', href: '#' },
    { label: 'Deliver with Yaadro', href: '#' },
    { label: 'Franchise with Yaadro', href: '#' },
  ];

  return (
    <footer className="bg-white text-gray-800 mt-auto w-full max-w-full overflow-x-hidden border-t border-gray-200">
      <Container>
        <div className="py-8 md:py-12">
          {/* Popular Searches Section */}
          <div className="mb-8 md:mb-12">
            <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Popular Searches</h3>
            <div className="space-y-4 md:space-y-6">
              <div>
                <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3">Products:</h4>
                <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                  {popularSearches.products.length > 0 ? (
                    popularSearches.products.map((product, index) => (
                      <span key={index}>
                        {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                        <Link href={`/products?search=${encodeURIComponent(product)}`} className="hover:text-primary-dark transition-colors">
                          {product}
                        </Link>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">Loading popular products...</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3">Brands:</h4>
                <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                  {popularSearches.brands.map((brand, index) => (
                    <span key={index}>
                      {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                      <Link href={`/products?brand=${encodeURIComponent(brand)}`} className="hover:text-gray-900 transition-colors">
                        {brand}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3">Categories:</h4>
                <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                  {popularSearches.categories.length > 0 ? (
                    popularSearches.categories.map((category, index) => (
                      <span key={index}>
                        {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                        <Link href={`/products?category=${encodeURIComponent(category)}`} className="hover:text-primary-dark transition-colors">
                          {category}
                        </Link>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">Loading categories...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="mb-8 md:mb-12">
            <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
              {footerCategories.map((column, colIndex) => (
                <div key={colIndex} className="space-y-4">
                  {column.map((category, index) => {
                    const mappedCategories = categoryMapping[category] || [];
                    const categoryLink = mappedCategories.length > 0 
                      ? `/products?category=${encodeURIComponent(mappedCategories[0])}`
                      : `/products?search=${encodeURIComponent(category)}`;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <Link
                          href={categoryLink}
                          className="block text-sm md:text-base font-semibold text-gray-900 hover:text-primary-dark transition-colors mb-2"
                        >
                          {category}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-300 my-8 md:my-12"></div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            {/* Logo and Social Media */}
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <span className="text-2xl md:text-3xl font-bold text-primary">Yaadro</span>
              </Link>
              <div className="flex gap-3 mb-4">
                <a href="#" aria-label="Instagram" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" aria-label="X (Twitter)" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Facebook" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
              <p className="text-xs md:text-sm text-gray-500 mb-1">
                © {currentYear} Yaadro Marketplace Private Limited
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                fssai lic no: 11224999000872
              </p>
            </div>

            {/* Company Links */}
            <div className="md:col-span-1">
              <h4 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Company</h4>
              <ul className="space-y-2 md:space-y-3">
                {companyLinks.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-xs md:text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policy & Partner Links */}
            <div className="md:col-span-1">
              <h4 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Policy & Partners</h4>
              <ul className="space-y-2 md:space-y-3">
                {policyLinks.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href} className="text-xs md:text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* App Download */}
            <div className="md:col-span-1">
              <h4 className="text-sm md:text-base font-semibold mb-3 md:mb-4">Download App</h4>
              <div className="space-y-3">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span className="text-xs md:text-sm">Get it on play store</span>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05,20.28C16.45,20.64 15.8,20.81 15.1,20.81C14.4,20.81 13.73,20.64 13.14,20.28C12.55,19.93 12.08,19.45 11.73,18.86C11.38,18.27 11.2,17.6 11.2,16.9C11.2,16.2 11.38,15.53 11.73,14.94C12.08,14.35 12.55,13.87 13.14,13.52C13.73,13.17 14.4,13 15.1,13C15.8,13 16.45,13.17 17.05,13.52C17.65,13.87 18.12,14.35 18.47,14.94C18.82,15.53 19,16.2 19,16.9C19,17.6 18.82,18.27 18.47,18.86C18.12,19.45 17.65,19.93 17.05,20.28M12.72,4.08C13.18,4.3 13.58,4.62 13.9,5L16.9,8.5L15.5,9.5L12.9,6.3C12.7,6.05 12.45,5.85 12.15,5.7L12.72,4.08M12.13,14C12.13,14.24 12.2,14.45 12.33,14.63C12.46,14.81 12.63,14.94 12.83,15C13,15.05 13.2,15.05 13.4,15C13.6,14.94 13.77,14.81 13.9,14.63C14.03,14.45 14.1,14.24 14.1,14C14.1,13.76 14.03,13.55 13.9,13.37C13.77,13.19 13.6,13.06 13.4,13C13.2,12.95 13,12.95 12.83,13C12.63,13.06 12.46,13.19 12.33,13.37C12.2,13.55 12.13,13.76 12.13,14M5.28,6.22L10.14,9.33L11.72,7.2L6.86,4.08L5.28,6.22M18.22,19.78L16.64,21.9L11.78,18.79L13.36,16.67L18.22,19.78M20.47,10.5C20.47,10.88 20.38,11.24 20.2,11.58L18.9,14.08L17.5,13.08L18.8,10.58C18.93,10.24 19,9.88 19,9.5C19,9.12 18.93,8.76 18.8,8.42L17.5,5.92L18.9,4.92L20.2,7.42C20.38,7.76 20.47,8.12 20.47,8.5V10.5Z"/>
                  </svg>
                  <span className="text-xs md:text-sm">Get it on app store</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
