/**
 * Normalized offer types / badges / cart grouping for storefront promo UX.
 * Supports same-SKU BOGO and cross-SKU buy→reward rules from the promotions engine.
 */

import {
  bundleRuleRoleForProduct,
  formatBundleRibbonLabel,
  formatBundleRuleLabel,
  getPrimaryBundleRule,
  hasActiveOffer,
  isCrossSkuBundleRule,
} from "./productUtils";
import {
  getBundleFreeExtraOnPaidLine,
  getCartLineBundleLabel,
  getCartLineBundleRule,
  getCartLinePaidQty,
  getPaidCartItemId,
  isBundleRewardCartLine,
} from "./cartPromotions";

export const OFFER_TYPES = Object.freeze({
  CATALOG_OFFER: "catalog_offer",
  SKU_PRICE: "sku_price",
  BUY_X_GET_Y: "buy_x_get_y",
  COUPON: "coupon",
  NONE: "none",
});

function parseMoney(value) {
  const n = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Compact same-SKU badge: BOGO / B2G1 — never use for cross-SKU. */
export function formatBogoBadge(rule) {
  if (!rule || typeof rule !== "object") return "BOGO";
  if (isCrossSkuBundleRule(rule)) return "BUY";
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  if (Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0) {
    if (buy === 1 && get === 1) return "BOGO";
    return `B${buy}G${get}`;
  }
  return "BOGO";
}

function shelfOfferMode(product) {
  const mode = String(product?.bxgyOfferMode || "").trim();
  if (mode === "cross_sku" || mode === "same_sku") return mode;
  return null;
}

/**
 * Resolve whether this product card should read as same-SKU BOGO or cross unlock.
 * @returns {'same' | 'buy' | 'get'}
 */
function resolveOfferRole(product, rule) {
  const shelfRole = String(product?.bxgyShelfRole || "").trim();
  if (shelfRole === "buy" || shelfRole === "get") return shelfRole;

  const mode = shelfOfferMode(product);
  if (mode === "cross_sku") return "buy";
  if (mode === "same_sku") return "same";

  if (rule) return bundleRuleRoleForProduct(rule, product?.id);
  return "same";
}

function isCrossOffer(product, rule, role) {
  const mode = shelfOfferMode(product);
  if (mode === "cross_sku") return true;
  if (mode === "same_sku") return false;
  if (role === "buy" || role === "get") {
    // Shelf role without mode: treat buy/get split as cross unless same_sku mode set.
    if (String(product?.bxgyShelfRole || "").trim()) return true;
  }
  return isCrossSkuBundleRule(rule);
}

/** Catalog / PLP / PDP offer chips from a product. */
export function getProductOfferDisplay(product) {
  if (!product) {
    return {
      offerType: OFFER_TYPES.NONE,
      badges: [],
      secondaryText: null,
      bundleLabel: null,
      saveRupees: null,
      buyQty: null,
      getQty: null,
    };
  }

  const shelfRole = String(product.bxgyShelfRole || "").trim();
  const shelfBuy = Number(product.bxgyBuyQty);
  const shelfGet = Number(product.bxgyGetQty);
  const shelfRule =
    Number.isFinite(shelfBuy) &&
    shelfBuy > 0 &&
    Number.isFinite(shelfGet) &&
    shelfGet > 0
      ? { buy_qty: shelfBuy, get_qty: shelfGet, reward_type: "free" }
      : { buy_qty: 1, get_qty: 1, reward_type: "free" };

  const engineRule = getPrimaryBundleRule(product);
  const role = resolveOfferRole(product, engineRule);
  const cross = isCrossOffer(product, engineRule, role);

  // Prefer shelf qty chrome; for non-shelf, prefer engine rule when present.
  const rule =
    shelfRole === "buy" || shelfRole === "get"
      ? {
          ...shelfRule,
          ...(cross ? { scope: "cross_shop_products" } : {}),
        }
      : engineRule || (cross ? { ...shelfRule, scope: "cross_shop_products" } : null);

  // Home / PLP "Get free" chrome — never imply same-product BOGO.
  if (role === "get") {
    const buyName =
      engineRule?.buy_product_name ||
      engineRule?.buyProductName ||
      product?.bxgyBuyProductName ||
      "";
    const getLabel = formatBundleRuleLabel(
      rule || engineRule || shelfRule,
      { role: "get", buyName },
    );
    return {
      offerType: OFFER_TYPES.BUY_X_GET_Y,
      badges: ["FREE"],
      secondaryText: getLabel,
      bundleLabel: getLabel,
      bundleRibbon: "FREE",
      saveRupees: null,
      buyQty: Number(rule?.buy_qty ?? shelfRule.buy_qty) || null,
      getQty: Number(rule?.get_qty ?? shelfRule.get_qty) || null,
      dealMode: "cross_sku",
    };
  }

  // Cross-SKU buy card: name the free product when known.
  if (role === "buy" && cross) {
    const buy = Number(rule?.buy_qty ?? shelfRule.buy_qty) || 1;
    const get = Number(rule?.get_qty ?? shelfRule.get_qty) || 1;
    const buyName = product?.name || product?.shortName || "";
    const getName =
      engineRule?.reward_product_name ||
      engineRule?.rewardProductName ||
      product?.bxgyGetProductName ||
      "";
    const label = formatBundleRuleLabel(rule || engineRule || shelfRule, {
      role: "buy",
      buyName,
      getName,
    });
    return {
      offerType: OFFER_TYPES.BUY_X_GET_Y,
      badges: ["BUY"],
      secondaryText: label,
      bundleLabel: label,
      bundleRibbon: "BUY",
      saveRupees: null,
      buyQty: buy,
      getQty: get,
      dealMode: "cross_sku",
    };
  }

  const effectiveRule = rule || (shelfRole === "buy" ? shelfRule : null);
  const bundleLabel = effectiveRule
    ? formatBundleRuleLabel(effectiveRule, { role: "same" })
    : String(product.bundleLabel || "").trim() || null;
  const badges = [];
  let offerType = OFFER_TYPES.NONE;

  if (effectiveRule) {
    offerType = OFFER_TYPES.BUY_X_GET_Y;
    badges.push(formatBogoBadge(effectiveRule));
  }

  // Catalog shape: `price` = MRP/list, `offerPrice` = what customer pays when on sale.
  // Legacy: `originalPrice` > `price` means `price` is already the sale amount.
  const listFromMrp = parseMoney(product.price);
  const original = parseMoney(
    product.originalPrice ?? product.actualPrice ?? product.listPrice,
  );
  const list =
    original > listFromMrp + 0.004
      ? original
      : listFromMrp > 0
        ? listFromMrp
        : original;
  const payFromOffer = parseMoney(
    product.offerPrice ?? product.offerPriceEffective,
  );
  const pay =
    payFromOffer > 0 && list > 0 && payFromOffer < list - 0.004
      ? payFromOffer
      : original > listFromMrp + 0.004
        ? listFromMrp
        : listFromMrp;

  let saveRupees = null;
  // On buy shelf, keep deal as the primary story — skip SAVE stacking.
  if (shelfRole !== "buy" && list > pay + 0.004) {
    saveRupees = Math.round((list - pay) * 100) / 100;
    badges.push(`SAVE ₹${Math.round(saveRupees)}`);
    if (offerType === OFFER_TYPES.NONE) offerType = OFFER_TYPES.CATALOG_OFFER;
  } else if (
    shelfRole !== "buy" &&
    hasActiveOffer(product) &&
    offerType === OFFER_TYPES.NONE
  ) {
    offerType = OFFER_TYPES.CATALOG_OFFER;
  }

  const promoTypes = product?.promo?.types ?? product?.promoTypes;
  if (
    Array.isArray(promoTypes) &&
    promoTypes.includes("sku") &&
    offerType === OFFER_TYPES.NONE
  ) {
    offerType = OFFER_TYPES.SKU_PRICE;
  }

  let secondaryText = null;
  if (shelfRole === "buy") {
    secondaryText = bundleLabel || formatBundleRuleLabel(shelfRule, { role: "same" });
  } else if (bundleLabel) secondaryText = bundleLabel;
  else if (saveRupees != null && saveRupees > 0) secondaryText = "On sale";

  return {
    offerType,
    badges,
    secondaryText,
    bundleLabel:
      shelfRole === "buy"
        ? bundleLabel || formatBundleRuleLabel(shelfRule, { role: "same" })
        : bundleLabel,
    bundleRibbon: effectiveRule
      ? formatBundleRibbonLabel(effectiveRule, { compact: true, role: "same" })
      : null,
    saveRupees,
    buyQty: effectiveRule
      ? Number(effectiveRule.buy_qty ?? effectiveRule.buyQty) || null
      : null,
    getQty: effectiveRule
      ? Number(effectiveRule.get_qty ?? effectiveRule.getQty) || null
      : null,
    dealMode: "same_sku",
  };
}

/**
 * Full list of product-related offers for PDP (every BXGY rule + sale savings).
 * Compact PLP/cards still use {@link getProductOfferDisplay}.
 */
export function getProductOfferList(product) {
  if (!product) return [];

  const rows = [];
  const rules = Array.isArray(product.bundleRules)
    ? product.bundleRules
    : Array.isArray(product.bundle_rules)
      ? product.bundle_rules
      : [];
  const pid = String(product.id ?? product.productId ?? "");

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule || typeof rule !== "object") continue;
    const role = bundleRuleRoleForProduct(rule, pid);
    const cross = isCrossSkuBundleRule(rule);
    const buyName =
      role === "buy"
        ? product.name || product.shortName || ""
        : rule.buy_product_name || rule.buyProductName || "";
    const getName =
      rule.reward_product_name ||
      rule.rewardProductName ||
      rule.get_product_name ||
      (role === "get" ? product.name || product.shortName || "" : "");
    const title = formatBundleRuleLabel(rule, { role, buyName, getName });
    const badge = cross
      ? role === "get"
        ? "FREE"
        : "BUY"
      : formatBogoBadge(rule);
    rows.push({
      id: `bxgy-${rule.promotion_id || rule.promotionId || i}-${role}`,
      kind: OFFER_TYPES.BUY_X_GET_Y,
      badges: [badge],
      title,
      hint: cross
        ? role === "get"
          ? "Free when you buy the paired product (added in cart when you qualify)."
          : "Add this product — free reward is added to your cart when you qualify."
        : "Free units are added to your cart when you qualify.",
      dealMode: cross ? "cross_sku" : "same_sku",
    });
  }

  const listFromMrp = parseMoney(product.price);
  const original = parseMoney(
    product.originalPrice ?? product.actualPrice ?? product.listPrice,
  );
  const list =
    original > listFromMrp + 0.004
      ? original
      : listFromMrp > 0
        ? listFromMrp
        : original;
  const payFromOffer = parseMoney(
    product.offerPrice ?? product.offerPriceEffective,
  );
  const pay =
    payFromOffer > 0 && list > 0 && payFromOffer < list - 0.004
      ? payFromOffer
      : original > listFromMrp + 0.004
        ? listFromMrp
        : listFromMrp;
  if (list > pay + 0.004) {
    const saveRupees = Math.round((list - pay) * 100) / 100;
    rows.push({
      id: "price-save",
      kind: OFFER_TYPES.CATALOG_OFFER,
      badges: [`SAVE ₹${Math.round(saveRupees)}`],
      title: `Sale price ₹${pay.toFixed(pay % 1 ? 2 : 0)} (was ₹${list.toFixed(list % 1 ? 2 : 0)})`,
      hint: "Discount already shown in the price above.",
      dealMode: null,
    });
  }

  // Shelf chrome with no engine rules still needs at least the compact story.
  if (!rows.length) {
    const compact = getProductOfferDisplay(product);
    if (compact.badges?.length || compact.secondaryText) {
      rows.push({
        id: "primary",
        kind: compact.offerType || OFFER_TYPES.NONE,
        badges: compact.badges || [],
        title: compact.secondaryText || compact.bundleLabel || "",
        hint:
          compact.offerType === OFFER_TYPES.BUY_X_GET_Y
            ? compact.dealMode === "cross_sku"
              ? "Add the buy item — free reward is added to your cart when you qualify."
              : "Free units are added to your cart when you qualify."
            : null,
        dealMode: compact.dealMode || null,
      });
    }
  }

  return rows;
}

function lineUnitPrice(item) {
  if (isBundleRewardCartLine(item)) return 0;
  const fromSize = item?.selectedSize?.price;
  if (fromSize != null && Number.isFinite(Number(fromSize)))
    return Number(fromSize);
  return parseMoney(item?.price);
}

function lineListUnit(item) {
  if (
    item?.originalPrice != null &&
    Number.isFinite(Number(item.originalPrice))
  ) {
    return Number(item.originalPrice);
  }
  return null;
}

function linePayTotal(item) {
  if (isBundleRewardCartLine(item)) return 0;
  if (Number.isFinite(Number(item.lineTotal)) && item.lineTotal >= 0)
    return Number(item.lineTotal);
  return lineUnitPrice(item) * (Number(item.quantity) || 1);
}

/**
 * Group expanded cart lines into parent + free children for OfferGroupCard.
 * @param {unknown[]} items already expanded cart rows
 */
export function buildCartOfferGroups(items) {
  const list = Array.isArray(items) ? items : [];
  const rewardsByParent = new Map();

  for (const it of list) {
    if (!isBundleRewardCartLine(it)) continue;
    const pid = String(getPaidCartItemId(it) || "");
    if (!pid) continue;
    const arr = rewardsByParent.get(pid) || [];
    arr.push(it);
    rewardsByParent.set(pid, arr);
  }

  const groups = [];
  for (const it of list) {
    if (isBundleRewardCartLine(it)) continue;
    const parentId = String(it.cartItemId ?? it.id ?? it.cartItemKey ?? "");
    const children = rewardsByParent.get(parentId) || [];
    const freeExtra = getBundleFreeExtraOnPaidLine(it);
    const rule = getCartLineBundleRule(it);
    const badges = [];
    let offerType = OFFER_TYPES.NONE;
    const cross = isCrossSkuBundleRule(rule);
    const parentProductId = String(it.productId ?? it.product?.id ?? it.id ?? "");
    const freeIsDifferentSku = children.some((c) => {
      const childProductId = String(c.productId ?? c.product?.id ?? "");
      if (childProductId && parentProductId) {
        return childProductId !== parentProductId;
      }
      // Fallback: synthetic reward without productId still counts as cross when rule says so.
      return cross;
    });

    if (children.length > 0 || freeExtra > 0) {
      offerType = OFFER_TYPES.BUY_X_GET_Y;
      if (cross || freeIsDifferentSku) {
        badges.push("BUY");
        badges.push("FREE");
      } else {
        badges.push(formatBogoBadge(rule));
        badges.push("FREE");
      }
    }

    const unit = lineUnitPrice(it);
    const listUnit = lineListUnit(it);
    const paidQty = getCartLinePaidQty(it);
    let savingsMajor = 0;
    if (listUnit != null && listUnit > unit + 0.004) {
      savingsMajor += (listUnit - unit) * paidQty;
      badges.push(`SAVE ₹${Math.round((listUnit - unit) * paidQty)}`);
      if (offerType === OFFER_TYPES.NONE) offerType = OFFER_TYPES.CATALOG_OFFER;
    }
    if (freeExtra > 0) {
      savingsMajor += unit * freeExtra;
    }

    const promoTypes = it?.promo?.types ?? it?.promoTypes;
    if (
      Array.isArray(promoTypes) &&
      promoTypes.includes("sku") &&
      offerType === OFFER_TYPES.NONE
    ) {
      offerType = OFFER_TYPES.SKU_PRICE;
    }

    groups.push({
      parentLineItemId: parentId,
      offerType,
      parent: it,
      children,
      badges: [...new Set(badges)],
      savingsMinor: Math.round(savingsMajor * 100),
      bundleLabel: (() => {
        if (!rule) return getCartLineBundleLabel(it);
        const buyName = it?.name || it?.productName || "";
        const getName =
          children.find((c) => c?.name)?.name ||
          rule.reward_product_name ||
          rule.rewardProductName ||
          "";
        return formatBundleRuleLabel(rule, {
          role: cross ? "buy" : "same",
          buyName,
          getName,
        });
      })(),
      paidQuantity: paidQty,
      freeQuantity:
        freeExtra ||
        children.reduce((s, c) => s + (Number(c.quantity) || 0), 0),
    });
  }

  return groups;
}

/**
 * Coupon threshold hint from cart promotions + optional coupon catalog rows.
 * @returns {{ message: string, code: string | null, remainingMinor: number } | null}
 */
export function getCouponThresholdHint(
  promotions,
  cartSubtotalMinor,
  couponCatalog = [],
) {
  const sub = Math.max(0, Number(cartSubtotalMinor) || 0);
  const catalog = Array.isArray(couponCatalog) ? couponCatalog : [];
  const suggested = promotions?.suggestedCoupons || [];

  let best = null;
  for (const row of catalog) {
    const min = Number(row.minSubtotalMinor ?? row.min_subtotal_minor);
    if (!Number.isFinite(min) || min <= 0) continue;
    if (sub >= min) continue;
    const remaining = min - sub;
    const code = String(row.code || "").toUpperCase() || null;
    if (!best || remaining < best.remainingMinor) {
      best = {
        code,
        remainingMinor: remaining,
        message: code
          ? `₹${(remaining / 100).toLocaleString("en-IN")} more for ${code}`
          : `₹${(remaining / 100).toLocaleString("en-IN")} more for a coupon`,
      };
    }
  }

  if (best) return best;

  const coupon = promotions?.coupon;
  if (
    coupon &&
    (coupon.reasonCode === "MIN_SUBTOTAL_NOT_MET" ||
      coupon.reason_code === "MIN_SUBTOTAL_NOT_MET") &&
    coupon.code
  ) {
    return {
      code: String(coupon.code).toUpperCase(),
      remainingMinor: 0,
      message:
        coupon.reasonMessage ||
        coupon.reason_message ||
        `Add more items for ${String(coupon.code).toUpperCase()}`,
    };
  }

  if (suggested.length > 0) {
    const row = suggested.find((s) => s.applicable === false) || suggested[0];
    if (
      row?.code &&
      Array.isArray(row.reasonCodes) &&
      row.reasonCodes.includes("MIN_SUBTOTAL_NOT_MET")
    ) {
      return {
        code: String(row.code).toUpperCase(),
        remainingMinor: 0,
        message: `Add more items for ${String(row.code).toUpperCase()}`,
      };
    }
  }

  return null;
}

/** Compare free-unit totals across cart snapshots (for add-to-cart toast). */
export function sumCartFreeUnits(items) {
  const list = Array.isArray(items) ? items : [];
  let free = 0;
  for (const it of list) {
    if (isBundleRewardCartLine(it)) {
      free += Math.max(0, Number(it.quantity) || 0);
      continue;
    }
    free += getBundleFreeExtraOnPaidLine(it);
  }
  // Avoid double-count when both embedded free and reward rows exist
  const hasRewards = list.some(isBundleRewardCartLine);
  const embedded = list
    .filter((it) => !isBundleRewardCartLine(it))
    .reduce((s, it) => s + getBundleFreeExtraOnPaidLine(it), 0);
  if (hasRewards && embedded > 0) {
    return list
      .filter(isBundleRewardCartLine)
      .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }
  return free;
}

export function findProductNameForNewFreeUnits(prevItems, nextItems) {
  const prevMap = new Map();
  for (const it of prevItems || []) {
    if (isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? "");
    prevMap.set(id, getBundleFreeExtraOnPaidLine(it));
  }
  for (const it of nextItems || []) {
    if (isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? "");
    const nextFree = getBundleFreeExtraOnPaidLine(it);
    const prevFree = prevMap.get(id) || 0;
    if (nextFree > prevFree) {
      return String(it.name || it.productName || "item");
    }
  }

  // Cross BXGY free rows are separate `:bundle-reward` lines (not embedded free on paid).
  const prevRewardQty = new Map();
  for (const it of prevItems || []) {
    if (!isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? "");
    prevRewardQty.set(id, Math.max(0, Number(it.quantity) || 0));
  }
  for (const it of nextItems || []) {
    if (!isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? "");
    const nextQty = Math.max(0, Number(it.quantity) || 0);
    const prevQty = prevRewardQty.get(id) || 0;
    if (nextQty > prevQty) {
      return String(it.name || it.productName || "item");
    }
  }
  return null;
}

export { lineUnitPrice, lineListUnit, linePayTotal };
