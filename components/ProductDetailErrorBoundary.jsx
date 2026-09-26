'use client';

import { Component } from 'react';
import Link from 'next/link';

/**
 * Catches render crashes on PDP so one bad product payload cannot blank the whole app.
 */
export default class ProductDetailErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ProductDetailErrorBoundary]', error, info?.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Couldn’t open this product</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Something went wrong while loading the details. Try again or browse other products.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Try again
            </button>
            <Link
              href="/products"
              className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Back to products
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
