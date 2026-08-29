'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GiftRegular as Gift,
  Loading2Regular as Loader2,
  PercentageRegular as Percent,
  TagRegular as Tag,
} from '../icons';
import { useCategories } from '../../hooks/useProducts';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';

function hasAnyOffer(cat) {
  const o = cat?.offers;
  if (o && (o.has_sku_promo || o.has_bundle || o.has_category_discount)) return true;
  if (Array.isArray(cat?.bundleRules) && cat.bundleRules.length > 0) return true;
  if (Array.isArray(cat?.categoryDiscountRules) && cat.categoryDiscountRules.length > 0) return true;
  return false;
}

function formatDiscountRule(rule) {
  if (!rule) return null;
  const pct = rule.discount_percent ?? rule.discountPercent;
  if (pct != null && Number(pct) > 0) return `${Math.round(Number(pct))}% off`;
  const amt = rule.discount_amount ?? rule.discountAmount;
  if (amt != null && Number(amt) > 0) return `₹${Number(amt)} off`;
  return null;
}

function formatBundleRule(rule) {
  if (!rule) return null;
  const buy = rule.buy_quantity ?? rule.buyQuantity;
  const get = rule.free_quantity ?? rule.freeQuantity ?? rule.getQuantity ?? rule.get_quantity;
  if (buy && get) return `Buy ${buy} Get ${get} Free`;
  return 'Bundle offer available';
}

function getOfferLabels(cat) {
  const labels = [];
  const o = cat?.offers || {};

  if (Array.isArray(cat?.categoryDiscountRules)) {
    for (const r of cat.categoryDiscountRules) {
      const l = formatDiscountRule(r);
      if (l) labels.push({ text: l, type: 'discount' });
    }
  }

  if (Array.isArray(cat?.bundleRules)) {
    for (const r of cat.bundleRules) {
      const l = formatBundleRule(r);
      if (l) labels.push({ text: l, type: 'bundle' });
    }
  }

  if (labels.length === 0) {
    if (o.has_category_discount) labels.push({ text: 'Category discount', type: 'discount' });
    if (o.has_bundle) labels.push({ text: 'Bundle offer', type: 'bundle' });
    if (o.has_sku_promo) labels.push({ text: 'Product promo', type: 'promo' });
  }

  return labels;
}

function OfferCategoryCard({ category }) {
  const imageUrl = getCategoryImageUrl(category);
  const labels = getOfferLabels(category);

  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.id)}`}
      className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3 transition hover:shadow-sm active:scale-[0.99]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/60">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover object-center"
            unoptimized
          />
        ) : (
          <Image
            src={CATEGORY_DUMMY_IMAGE}
            alt=""
            fill
            sizes="48px"
            className="object-contain object-center p-1.5"
            unoptimized
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{category.name}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {labels.map((label, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                label.type === 'discount'
                  ? 'bg-green-100 text-green-800'
                  : label.type === 'bundle'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-violet-100 text-violet-800'
              }`}
            >
              {label.type === 'discount' ? (
                <Percent size={10} className="h-2.5 w-2.5" />
              ) : label.type === 'bundle' ? (
                <Gift size={10} className="h-2.5 w-2.5" />
              ) : (
                <Tag size={10} className="h-2.5 w-2.5" />
              )}
              {label.text}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function ProfileOffersSection() {
  const { data: categories, isLoading, isError } = useCategories();

  const categoriesWithOffers = useMemo(
    () => (categories || []).filter(hasAnyOffer),
    [categories]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 size={20} className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || categoriesWithOffers.length === 0) {
    return (
      <p className="py-2 text-center text-[13px] text-gray-500">
        No category offers right now. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {categoriesWithOffers.map((cat) => (
        <OfferCategoryCard key={cat.id} category={cat} />
      ))}
    </div>
  );
}
