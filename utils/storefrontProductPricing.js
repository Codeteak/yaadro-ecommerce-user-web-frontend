/**
 * Normalize admin/storefront product pricing into ProductCard shape:
 * - `price` = list (tag / MRP)
 * - `offerPrice` = payable when discounted
 *
 * Never invents discounts — only uses fields present on the payload.
 */

import { minorToMajor, parseMinorInt } from './currencyMinor';

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/**
 * @param {object} raw — storefront product or home-sections product
 * @returns {{
 *   listPrice: number,
 *   offerPrice: number|null,
 *   hasDiscount: boolean,
 *   actualPriceMinor: number,
 *   finalPriceMinor: number,
 *   totalDiscountMinor: number,
 *   offerPriceMinor: number,
 *   promoPriceMinor: number,
 *   promoPrice: number|null,
 *   discountPercentage: number,
 * }}
 */
export function normalizeStorefrontProductPricing(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      listPrice: 0,
      offerPrice: null,
      hasDiscount: false,
      actualPriceMinor: 0,
      finalPriceMinor: 0,
      totalDiscountMinor: 0,
      offerPriceMinor: 0,
      promoPriceMinor: 0,
      promoPrice: null,
      discountPercentage: 0,
    };
  }

  let listMinor = parseMinorInt(
    firstDefined(
      raw.actual_price_minor,
      raw.actualPriceMinor,
      raw.total_price_minor,
      raw.totalPriceMinor,
      raw.price_minor_per_unit,
      raw.priceMinorPerUnit,
      raw.price_minor,
      raw.priceMinor,
      raw.list_price_minor,
      raw.listPriceMinor
    )
  );

  let finalMinor = parseMinorInt(
    firstDefined(
      raw.final_price_minor,
      raw.finalPriceMinor,
      raw.offer_price_minor_per_unit,
      raw.offerPriceMinorPerUnit
    )
  );

  const offerLayerMinor = parseMinorInt(
    firstDefined(raw.offer_price_minor, raw.offerPriceMinor)
  );
  const promoLayerMinor = parseMinorInt(
    firstDefined(raw.promo_price_minor, raw.promoPriceMinor)
  );
  let totalDiscountMinor = parseMinorInt(
    firstDefined(
      raw.total_discount_minor,
      raw.totalDiscountMinor,
      raw.discount_minor,
      raw.discountMinor,
      raw.line_discount_minor,
      raw.lineDiscountMinor
    )
  );

  let listPrice = listMinor > 0 ? minorToMajor(listMinor) : 0;
  if (!(listPrice > 0)) {
    const majorList = Number(
      firstDefined(raw.price, raw.listPrice, raw.list_price, raw.mrp, raw.mrpPrice)
    );
    if (Number.isFinite(majorList) && majorList > 0) {
      listPrice = majorList;
      listMinor = Math.round(listPrice * 100);
    }
  }

  const majorDiscount = Number(
    firstDefined(
      raw.discountAmount,
      raw.discount_amount,
      raw.offerDiscount,
      raw.offer_discount,
      typeof raw.discount === 'number' ? raw.discount : undefined
    )
  );
  if (
    (!(totalDiscountMinor > 0) || totalDiscountMinor >= listMinor) &&
    Number.isFinite(majorDiscount) &&
    majorDiscount > 0 &&
    listPrice > 0 &&
    majorDiscount < listPrice
  ) {
    totalDiscountMinor = Math.round(majorDiscount * 100);
  }

  if (listMinor > 0 && totalDiscountMinor > 0 && totalDiscountMinor < listMinor) {
    const fromDiscount = listMinor - totalDiscountMinor;
    if (!(finalMinor > 0) || finalMinor >= listMinor) {
      finalMinor = fromDiscount;
    }
  }

  const majorOffer = Number(
    firstDefined(raw.offerPrice, raw.offerPriceEffective, raw.sellingPrice, raw.selling_price)
  );
  if (
    (!(finalMinor > 0) || (listMinor > 0 && finalMinor >= listMinor)) &&
    Number.isFinite(majorOffer) &&
    majorOffer > 0 &&
    listPrice > 0 &&
    majorOffer < listPrice - 1e-9
  ) {
    finalMinor = Math.round(majorOffer * 100);
  }

  if (!(finalMinor > 0)) finalMinor = listMinor;

  let finalPrice = finalMinor > 0 ? minorToMajor(finalMinor) : listPrice;
  if (!(finalPrice > 0)) finalPrice = listPrice;

  const hasDiscount = listPrice > 0 && finalPrice < listPrice - 1e-9;
  const offerPrice = hasDiscount ? finalPrice : null;

  if (hasDiscount && !(totalDiscountMinor > 0)) {
    totalDiscountMinor = Math.max(0, listMinor - finalMinor);
  }

  const discountFromApi =
    totalDiscountMinor > 0 && listMinor > 0 ? (totalDiscountMinor / listMinor) * 100 : 0;
  const discountPercentage = hasDiscount
    ? discountFromApi > 0
      ? Math.round(discountFromApi)
      : Math.round(((listPrice - finalPrice) / listPrice) * 100)
    : 0;

  return {
    listPrice,
    offerPrice,
    hasDiscount,
    actualPriceMinor: listMinor,
    finalPriceMinor: hasDiscount ? finalMinor : listMinor,
    totalDiscountMinor: hasDiscount ? totalDiscountMinor : 0,
    offerPriceMinor: offerLayerMinor,
    promoPriceMinor: promoLayerMinor,
    promoPrice: promoLayerMinor > 0 ? minorToMajor(promoLayerMinor) : null,
    discountPercentage,
  };
}
