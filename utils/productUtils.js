// Utility functions for product operations

/**
 * Storefront catalog: `price` = MRP (list), `offerPrice` = what customer pays when on sale.
 * Legacy: `originalPrice` > `price` means `price` is already the sale price.
 */
function coerceSoldByWeightFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === 't' || s === 'yes' || s === '1';
  }
  return false;
}

export function hasSoldByWeightFlag(item) {
  if (!item || typeof item !== 'object') return false;
  return (
    coerceSoldByWeightFlag(item.soldByWeight) ||
    coerceSoldByWeightFlag(item.sold_by_weight) ||
    coerceSoldByWeightFlag(item.product?.soldByWeight) ||
    coerceSoldByWeightFlag(item.product?.sold_by_weight)
  );
}

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
  if (product?.ratingsAverage !== undefined && product?.ratingsAverage !== null) {
    const n = parseFloat(product.ratingsAverage);
    return Number.isFinite(n) ? n : 0;
  }
  // Fallback: Generate consistent rating based on product ID (for backward compatibility)
  if (typeof product?.id === 'number') {
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

/** True when checkout rule is buy-product-A → free-product-B (not same SKU). */
export function isCrossSkuBundleRule(rule) {
  if (!rule || typeof rule !== 'object') return false;
  if (String(rule.scope || '') === 'cross_shop_products') return true;
  // Legacy rows may omit scope but still carry distinct buy/reward IDs.
  const buyId = String(rule.buy_shop_product_id ?? rule.buyShopProductId ?? '').trim();
  const rewardId = String(
    rule.reward_shop_product_id ?? rule.rewardShopProductId ?? '',
  ).trim();
  return Boolean(buyId && rewardId && buyId !== rewardId);
}

/**
 * Role of this product in a bundle rule.
 * @returns {'same' | 'buy' | 'get'}
 */
export function bundleRuleRoleForProduct(rule, productId) {
  if (!rule || typeof rule !== 'object') return 'same';
  if (!isCrossSkuBundleRule(rule)) return 'same';
  const id = String(productId ?? '');
  if (!id) return 'buy';
  const rewardId = String(
    rule.reward_shop_product_id ?? rule.rewardShopProductId ?? ''
  );
  const buyId = String(rule.buy_shop_product_id ?? rule.buyShopProductId ?? '');
  if (rewardId && rewardId === id) return 'get';
  if (buyId && buyId === id) return 'buy';
  return 'buy';
}

function ruleNames(rule) {
  return {
    buyName:
      rule?.buy_product_name ??
      rule?.buyProductName ??
      rule?.buy_name ??
      '',
    getName:
      rule?.reward_product_name ??
      rule?.rewardProductName ??
      rule?.get_product_name ??
      rule?.getProductName ??
      '',
  };
}

/** Human-readable label for storefront `bundle_rules[]`. */
export function formatBundleRuleLabel(rule, { role = 'same', buyName, getName } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  if (!(Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0)) {
    return 'Offer';
  }
  const names = ruleNames(rule);
  // Lazy import avoided — inline short copy to prevent cycles with bxgyLabels.
  const left = String(buyName ?? names.buyName ?? '').trim();
  const right = String(getName ?? names.getName ?? '').trim();
  const short = (s) => (s.length > 28 ? `${s.slice(0, 26)}…` : s);

  if (role === 'get') {
    return left ? `Free with ${short(left)}` : 'Free with offer';
  }
  if (isCrossSkuBundleRule(rule) || role === 'buy') {
    if (left && right) {
      if (buy === 1 && get === 1) return `Buy ${short(left)} → ${short(right)} free`;
      return `Buy ${buy} ${short(left)} → ${get} ${short(right)} free`;
    }
    if (buy === 1 && get === 1) return 'Buy this → get that free';
    return `Buy ${buy} → get ${get} free`;
  }
  return `Buy ${buy} Get ${get} Free`;
}

/** Shorter copy for diagonal corner ribbons on narrow product tiles. */
export function formatBundleRibbonLabel(rule, { compact = false, role = 'same' } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);

  if (role === 'get') return 'FREE';
  if (isCrossSkuBundleRule(rule) || role === 'buy') {
    if (compact) return 'BUY';
    return formatBundleRuleLabel(rule, { role: 'buy' });
  }

  if (compact && Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0) {
    if (buy === 1 && get === 1) return 'B1G1';
    return `B${buy}G${get}`;
  }
  return formatBundleRuleLabel(rule, { role });
}

/** All bundle rules on a product (stable order). */
export function getBundleRules(product) {
  const rules = product?.bundleRules ?? product?.bundle_rules;
  return Array.isArray(rules) ? rules.filter((r) => r && typeof r === 'object') : [];
}

/**
 * Best rule for this product: prefer buy-side cross, then same-SKU, then get-side.
 * Avoids treating a free reward SKU as if it unlocks its own BOGO.
 */
export function getPrimaryBundleRule(product) {
  const rules = getBundleRules(product);
  if (!rules.length) return null;
  const pid = String(product?.id ?? product?.productId ?? '');
  const scored = rules.map((rule, index) => {
    const role = bundleRuleRoleForProduct(rule, pid);
    let score = 0;
    if (role === 'buy') score = 30;
    else if (role === 'same') score = 20;
    else if (role === 'get') score = 10;
    return { rule, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0]?.rule ?? rules[0];
}

/** True when this product is only a free reward (not also a buy trigger). */
export function isRewardOnlyBundleProduct(product) {
  const rules = getBundleRules(product);
  if (!rules.length) return false;
  const pid = String(product?.id ?? product?.productId ?? '');
  return rules.every((r) => bundleRuleRoleForProduct(r, pid) === 'get');
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

/** Parse product description from storefront / legacy API shapes. */
export function parseProductDescription(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const text =
    raw.description ??
    raw.long_description ??
    raw.longDescription ??
    raw.product_description ??
    raw.productDescription ??
    raw.details ??
    '';
  return typeof text === 'string' ? text.trim() : '';
}

/** Name fields used when inferring pack size from title (e.g. "Bread 400GM"). */
function productNameForWeightParse(raw) {
  if (!raw || typeof raw !== 'object') return '';
  return String(
    raw.name ??
      raw.title ??
      raw.title_snapshot ??
      raw.titleSnapshot ??
      raw.product_name ??
      raw.productName ??
      ''
  ).trim();
}

const WEIGHT_UNIT_IN_NAME_RE =
  /(\d+(?:\.\d+)?)\s*(gm|g|kg|kilogram|mg|ml|l|ltr|litre|liter|pc|pcs|piece|pieces|pkt|pack)|(\d+(?:\.\d+)?)(gm|g|kg|mg|ml|l|pc|pcs|pkt)/gi;

/** Normalize unit token from API or parsed name (e.g. g → gm, pcs → pc). */
export function normalizeProductUnit(unit) {
  if (unit == null || unit === '') return '';
  const u = String(unit).trim().toLowerCase();
  if (u === 'g' || u === 'gm') return 'gm';
  if (u === 'kilogram') return 'kg';
  if (u === 'ltr' || u === 'litre' || u === 'liter') return 'l';
  if (u === 'pcs' || u === 'piece' || u === 'pieces' || u === 'pkt' || u === 'pack') return 'pc';
  return u;
}

/** Display unit: g, kg, ml, l, … */
function formatUnitForDisplay(unit) {
  const normalized = normalizeProductUnit(unit);
  if (!normalized) return '';
  if (normalized === 'gm') return 'g';
  if (normalized === 'kg') return 'kg';
  if (normalized === 'mg') return 'mg';
  if (normalized === 'ml') return 'ml';
  if (normalized === 'l') return 'l';
  if (normalized === 'pc') return 'pc';
  return normalized.toLowerCase();
}

/**
 * Parse pack size from product title — e.g. "Bread 400GM" → { weight: 400, unit: "gm" }.
 * Uses the last match in the string (pack size is usually at the end).
 */
export function parseWeightUnitFromName(name) {
  if (name == null || name === '') return { weight: null, unit: '' };
  const s = String(name).trim();
  if (!s) return { weight: null, unit: '' };

  let last = null;
  let match;
  const re = new RegExp(WEIGHT_UNIT_IN_NAME_RE.source, 'gi');
  while ((match = re.exec(s)) !== null) {
    last = match;
  }
  if (!last) return { weight: null, unit: '' };

  const numStr = last[1] || last[3];
  const unitRaw = last[2] || last[4];
  const weight = parseFloat(numStr);
  return {
    weight: Number.isFinite(weight) ? weight : null,
    unit: unitRaw ? normalizeProductUnit(unitRaw) : '',
  };
}

/**
 * Strip a trailing pack token from a display name.
 * Examples:
 * - "Small Onion 10kg" -> "Small Onion"
 * - "Watermelon Kiran 3pcs" -> "Watermelon Kiran"
 * - "Milk 500 ml" -> "Milk"
 */
export function stripPackFromProductName(name) {
  if (name == null) return '';
  const s = String(name).trim();
  if (!s) return '';

  // Only strip when the last token matches our pack regex.
  // We remove the last match (not all matches) so names like "Mix 2kg Pack" don't get mangled.
  const re = new RegExp(WEIGHT_UNIT_IN_NAME_RE.source, 'gi');
  let lastMatch = null;
  let match;
  while ((match = re.exec(s)) !== null) lastMatch = match;
  if (!lastMatch) return s;

  // Match index is available as `match.index` in JS RegExp exec results.
  const idx = lastMatch.index;
  if (typeof idx !== 'number' || idx < 0) return s;

  // Only strip if match is at the end (or very close: allow trailing punctuation/spaces).
  const after = s.slice(idx + String(lastMatch[0] || '').length).trim();
  if (after !== '' && after !== ')' && after !== ']' && after !== '-' && after !== '·') return s;

  return s.slice(0, idx).trim().replace(/[-·(\\[]\\s*$/, '').trim();
}

/**
 * Group key for pack variants (e.g. "Small Onion 250g" and "Small Onion 10kg" → "small onion").
 * Falls back to product id when the name cannot be normalized.
 */
export function getProductVariantGroupKey(product) {
  if (!product || typeof product !== 'object') return '';
  const name = product?.name ?? product?.title ?? '';
  let base = stripPackFromProductName(name).trim().toLowerCase();
  if (!base && product?.slug) {
    const fromSlug = stripPackFromProductName(String(product.slug).replace(/-/g, ' '))
      .trim()
      .toLowerCase();
    if (fromSlug) base = fromSlug;
  }
  if (base) return base;
  const id = product?.id ?? product?.productId;
  return id != null && String(id).trim() ? `__id__:${id}` : '';
}

/** Sortable pack size (grams) for picking one variant per group; larger = unknown last. */
function variantPackSortGrams(product) {
  const { weight, unit } = resolveProductWeightAndUnit(product);
  if (weight == null || !Number.isFinite(weight)) return Number.POSITIVE_INFINITY;
  const u = String(unit || '')
    .trim()
    .toLowerCase();
  if (u === 'kg') return weight * 1000;
  if (u === 'g' || u === 'gm') return weight;
  if (u === 'l') return weight * 1000;
  if (u === 'ml') return weight;
  if (u === 'each' || u === 'pc') return weight;
  return weight;
}

/**
 * One row per product family in carousels/grids (same base name, different unit_size).
 * Default keeps the smallest pack; preserves first-seen order in the source list.
 *
 * @param {object[]} products
 * @param {{ pick?: 'smallest'|'first' }} [options]
 */
export function dedupeProductsByVariantGroup(products, options = {}) {
  const list = Array.isArray(products) ? products : [];
  const pick = options.pick === 'first' ? 'first' : 'smallest';
  if (!list.length) return [];

  const chosenByKey = new Map();

  for (const p of list) {
    const key = getProductVariantGroupKey(p);
    if (!key) continue;
    const existing = chosenByKey.get(key);
    if (!existing) {
      chosenByKey.set(key, p);
      continue;
    }
    if (pick === 'first') continue;
    if (variantPackSortGrams(p) < variantPackSortGrams(existing)) {
      chosenByKey.set(key, p);
    }
  }

  const seen = new Set();
  const out = [];
  for (const p of list) {
    const key = getProductVariantGroupKey(p);
    if (!key || seen.has(key)) continue;
    const chosen = chosenByKey.get(key);
    if (!chosen) continue;
    seen.add(key);
    out.push(chosen);
  }
  return out;
}

function parseProductWeightFromFields(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const candidate =
    raw.weight ??
    raw.net_weight ??
    raw.netWeight ??
    raw.gross_weight ??
    raw.grossWeight ??
    raw.weight_value ??
    raw.weightValue ??
    raw.pack_weight ??
    raw.packWeight;
  if (candidate == null || candidate === '') return null;
  const n = parseFloat(candidate);
  return Number.isFinite(n) ? n : null;
}

function parseProductUnitFromFields(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const u =
    raw.unit ??
    raw.unit_label ??
    raw.unit_label_snapshot ??
    raw.unitLabel ??
    raw.uom ??
    raw.measurement_unit ??
    raw.measurementUnit ??
    raw.base_unit ??
    raw.baseUnit ??
    '';
  return u != null ? normalizeProductUnit(u) : '';
}

function isMassUnitLabel(unit) {
  const u = String(unit || '').trim().toLowerCase();
  return (
    u === 'kg' ||
    u === 'kgs' ||
    u === 'kilogram' ||
    u === 'kilograms' ||
    u === 'g' ||
    u === 'gm' ||
    u === 'gram' ||
    u === 'grams'
  );
}

/**
 * Catalog mass amounts → kg for pricing (storefront prices are per kg).
 * Fixes gram-scale `unit_size` (e.g. 725) × ₹165/kg → ₹119625 on listing/cart.
 * @param {unknown} amount
 * @param {unknown} unit
 * @returns {number | null}
 */
export function massAmountInKg(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = String(unit || '')
    .trim()
    .toLowerCase();
  if (u === 'g' || u === 'gm' || u === 'gram' || u === 'grams') {
    return Math.round((n / 1000) * 10000) / 10000;
  }
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') {
    // Gram counts mis-labeled as kg (250, 500, 725…) — convert to kg.
    if (n > 20) return Math.round((n / 1000) * 10000) / 10000;
    return Math.round(n * 10000) / 10000;
  }
  // No unit but clearly a gram pack size (not a normal kg pack).
  if (!u && n > 20) return Math.round((n / 1000) * 10000) / 10000;
  return null;
}

/**
 * Amount of the base unit in one cart quantity.
 * Sold-by-weight prices per kg already, so the factor stays 1.
 * Packed mass: normalize gram-scale unit_size to kg before multiplying price.
 */
export function sellableUnitFactor(item) {
  if (!item || typeof item !== 'object') return 1;
  if (hasSoldByWeightFlag(item)) return 1;
  const n = parseProductUnitSize(item);
  if (n == null || !(n > 0)) return 1;
  const unit = parseProductUnitFromFields(item);
  const kg = massAmountInKg(n, unit);
  if (kg != null && (isMassUnitLabel(unit) || (!unit && n > 20))) {
    return kg;
  }
  return n;
}

/** Line rupees: packs × unit size × price per base unit. */
export function lineTotalFromUnitPricing(unitPrice, quantity, item) {
  const price = Number(unitPrice);
  const qty = Number(quantity);
  if (!Number.isFinite(price) || !Number.isFinite(qty)) return 0;
  return price * qty * sellableUnitFactor(item);
}

/** Show under 1 kg as grams (0.25 kg → 250 g, 0.255 kg → 255 g). */
export function formatMassAmountLabel(amount, unit) {
  const n = Number(amount);
  const u = String(unit || '').trim().toLowerCase();
  if (!Number.isFinite(n) || n <= 0 || !isMassUnitLabel(u)) return '';
  const isKg = u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms';
  const grams = isKg ? n * 1000 : n;
  if (grams < 1000) return `${Math.round(grams)} g`;
  const kg = Math.round((grams / 1000) * 1000) / 1000;
  return Number.isInteger(kg) ? `${kg} kg` : `${kg} kg`;
}

/**
 * Customer order line: ordered weight, billed weight when the picker changed it.
 * @returns {string}
 */
export function formatOrderLineWeight(item) {
  if (!item || typeof item !== 'object') return '';
  const unit = item.unitLabel || item.unit || item.unit_label_snapshot || '';
  if (!isMassUnitLabel(unit)) return '';
  const sizeRaw = item.unitSize ?? item.unit_size ?? item.unit_size_snapshot ?? 1;
  const size = Number(sizeRaw);
  // Sold-by-weight quantity is already kilograms. unit_size on the order is the
  // shop's step (e.g. 0.23) and must not be multiplied again.
  const factor = hasSoldByWeightFlag(item)
    ? 1
    : Number.isFinite(size) && size > 0
      ? size
      : 1;
  const billedQty = Number(item.quantity);
  if (!Number.isFinite(billedQty) || billedQty <= 0) return '';
  const orderedRaw = item.ordered_quantity ?? item.orderedQuantity;
  const orderedQty =
    orderedRaw != null && orderedRaw !== '' && Number.isFinite(Number(orderedRaw))
      ? Number(orderedRaw)
      : billedQty;
  const billed = formatMassAmountLabel(billedQty * factor, unit);
  const ordered = formatMassAmountLabel(orderedQty * factor, unit);
  if (!billed) return '';
  if (ordered && ordered !== billed) return `Ordered ${ordered} · Billed ${billed}`;
  return ordered || billed;
}

/** Catalog/cart/order pack size (string decimal from API, default `"1"` when absent). */
export function parseProductUnitSize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const v =
    raw.unit_size ??
    raw.unit_size_snapshot ??
    raw.unitSize ??
    raw.unitSizeSnapshot;
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Weight + unit from API fields, then from product name (e.g. "Milk 500ml").
 * @returns {{ weight: number|null, unit: string }}
 */
export function resolveProductWeightAndUnit(raw) {
  if (!raw || typeof raw !== 'object') {
    return { weight: null, unit: '' };
  }
  const unit = parseProductUnitFromFields(raw);
  const unitSize = parseProductUnitSize(raw);
  if (unitSize != null && unit) {
    return { weight: unitSize, unit };
  }
  let weight = parseProductWeightFromFields(raw);
  if (weight != null && unit) {
    return { weight, unit };
  }
  const fromName = parseWeightUnitFromName(productNameForWeightParse(raw));
  return {
    weight: weight ?? fromName.weight,
    unit: unit || fromName.unit,
  };
}

/** Parse sellable weight (e.g. 500, 1) from API or product name. */
export function parseProductWeight(raw) {
  return resolveProductWeightAndUnit(raw).weight;
}

/** Parse unit label (kg, gm, pc, …) from API or product name. */
export function parseProductUnit(raw) {
  return resolveProductWeightAndUnit(raw).unit;
}

/** Human-readable pack size, e.g. `400 g` or `1 kg`. */
export function formatWeightUnitLabel(weight, unit) {
  const displayUnit = formatUnitForDisplay(unit);
  if (weight != null && weight !== '') {
    const n = parseFloat(weight);
    const w = Number.isFinite(n)
      ? Number.isInteger(n)
        ? String(Math.trunc(n))
        : String(n)
      : String(weight).trim();
    if (w && displayUnit) return `${w} ${displayUnit}`;
    if (w) return w;
  }
  return displayUnit;
}

/** Subtitle under cart line name: pack (`unit_size` + `unit`) or API size label. */
export function getCartLineVariantLabel(item) {
  if (!item || typeof item !== 'object') return '';
  const soldByWeight = hasSoldByWeightFlag(item);
  const qty = Number(item.quantity);
  const unitSize = Number(
    item.unit_size ?? item.unitSize ?? item.unit_size_snapshot ?? item.unitSizeSnapshot
  );
  const unitRaw = item.unitLabel ?? item.unit ?? 'kg';

  // Sold-by-weight: show pack × step · total (e.g. 200 g × 5 · 1 kg).
  if (soldByWeight && Number.isFinite(qty) && qty > 0) {
    // Lazy import avoided — keep label helpers in productSizeSelection to prevent cycles.
    // Inline the same presentation as formatSoldByWeightPurchaseLabel without importing it.
    const stepRaw =
      item.weightStepKg ??
      item.product?.weightStepKg ??
      (Number.isFinite(unitSize) && Math.abs(unitSize - 1) >= 1e-9 ? unitSize : null);
    let stepKg = null;
    if (stepRaw != null) {
      const n = Number(stepRaw);
      if (Number.isFinite(n) && n > 0) {
        stepKg = massAmountInKg(n, unitRaw) ?? (n > 20 ? n / 1000 : n);
      }
    }
    if (!(stepKg > 0)) {
      // Fallback: treat common fractional kg qty as step (legacy lines without weightStepKg).
      stepKg = null;
    }
    const totalLabel =
      formatMassAmountLabel(qty, 'kg') || formatWeightUnitLabel(qty, 'kg');
    if (stepKg > 0) {
      const packs = Math.round(qty / stepKg);
      const exact = Math.abs(qty / stepKg - packs) < 1e-6;
      const stepLabel =
        formatMassAmountLabel(stepKg, 'kg') || formatWeightUnitLabel(stepKg, 'kg');
      if (exact && packs >= 1 && stepLabel) {
        if (packs === 1) return stepLabel;
        if (totalLabel && totalLabel !== stepLabel) {
          return `${stepLabel} × ${packs} · ${totalLabel}`;
        }
        return `${stepLabel} × ${packs}`;
      }
    }
    if (totalLabel) return totalLabel;
  }

  // Packed weight step: qty is pack count × catalog unit_size (e.g. 3 × 0.25 kg → 750 g).
  if (
    !soldByWeight &&
    Number.isFinite(unitSize) &&
    unitSize > 0 &&
    unitSize < 1 - 1e-9 &&
    Number.isFinite(qty) &&
    qty > 0
  ) {
    const u = String(unitRaw || '').trim().toLowerCase();
    if (u === 'kg' || u === 'g' || u === 'gm' || u === 'gram' || u === 'grams') {
      const amount = Math.round(unitSize * qty * 10000) / 10000;
      const label =
        formatMassAmountLabel(amount, u === 'g' || u === 'gm' ? 'g' : 'kg') ||
        formatWeightUnitLabel(amount, u === 'g' || u === 'gm' ? 'g' : 'kg');
      if (label) return label;
    }
  }

  const { weight, unit } = resolveProductWeightAndUnit({
    weight: item.weight,
    unit: item.unit,
    unit_size: item.unit_size ?? item.unitSize,
    unit_size_snapshot: item.unit_size_snapshot ?? item.unitSizeSnapshot,
    unit_label: item.unitLabel,
    unit_label_snapshot: item.unit_label_snapshot,
    name: item.name,
    title_snapshot: item.title_snapshot,
  });
  const pack = formatWeightUnitLabel(weight, unit);
  if (pack) return pack;
  const size = item.sizeDisplay != null ? String(item.sizeDisplay).trim() : '';
  if (size) return size;
  const unitOnly = item.unitLabel ?? item.unit;
  return unitOnly != null ? String(unitOnly).trim() : '';
}

function formatQuantityNumber(quantity) {
  const n = Number(quantity);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? String(Math.trunc(n)) : String(n);
}

/**
 * Line quantity with pack size, e.g. `2 × 0.5 L` (display-only; does not affect totals).
 */
export function formatQuantityWithPack(quantity, source) {
  if (!source || typeof source !== 'object') return '';
  const qtyStr = formatQuantityNumber(quantity);
  const { weight, unit } = resolveProductWeightAndUnit(source);
  const pack = formatWeightUnitLabel(weight, unit);
  if (!qtyStr && !pack) return '';
  if (!qtyStr) return pack;
  if (!pack) return `Qty ${qtyStr}`;
  return `${qtyStr} × ${pack}`;
}

