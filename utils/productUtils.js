// Utility functions for product operations

/**
 * Storefront catalog: `price` = MRP (list), `offerPrice` = what customer pays when on sale.
 * Legacy: `originalPrice` > `price` means `price` is already the sale price.
 */
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
  if (typeof product.id === 'number' && product.id % 3 === 0) {
    const seed = product.id * 11;
    return 10 + (seed % 30);
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

/** Human-readable label for storefront `bundle_rules[]` (e.g. Buy 2 Get 1 free). */
export function formatBundleRuleLabel(rule) {
  if (!rule || typeof rule !== 'object') return '';
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0) {
    if (reward === 'free') return `Buy ${buy} Get ${get} free`;
    return `Buy ${buy} Get ${get}`;
  }
  return 'Bundle offer';
}

/** Shorter copy for diagonal corner ribbons on narrow product tiles. */
export function formatBundleRibbonLabel(rule, { compact = false } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (compact && Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0) {
    if (reward === 'free') return `B${buy}G${get} FREE`;
    return `B${buy}G${get}`;
  }
  return formatBundleRuleLabel(rule);
}

export function getPrimaryBundleRule(product) {
  const rules = product?.bundleRules ?? product?.bundle_rules;
  if (!Array.isArray(rules) || !rules.length) return null;
  return rules[0];
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

/** Display unit: GM, KG, ML, … */
function formatUnitForDisplay(unit) {
  const normalized = normalizeProductUnit(unit);
  if (!normalized) return '';
  if (normalized === 'gm') return 'GM';
  if (normalized === 'kg') return 'KG';
  if (normalized === 'mg') return 'MG';
  if (normalized === 'ml') return 'ML';
  if (normalized === 'l') return 'L';
  if (normalized === 'pc') return 'PC';
  return normalized.toUpperCase();
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
    '';
  return u != null ? normalizeProductUnit(u) : '';
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

/** Human-readable pack size, e.g. `400 GM` or `1 KG`. */
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

