/**
 * Pure product/UI text coercers — safe to import from layout providers.
 * Kept out of productApi.js so root tree does not pull the API client graph.
 */

/**
 * Coerce API fields that may be string | object | array into safe UI text.
 * Prevents "Objects are not valid as a React child" on PDP and cards.
 */
export function toDisplayText(value) {
  if (value == null || value === false) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    for (const key of [
      'name',
      'label',
      'title',
      'text',
      'slug',
      'value',
      'message',
      'description',
      'en',
      'en_US',
      'en-US',
    ]) {
      const part = value[key];
      if (typeof part === 'string' && part.trim()) return part.trim();
      if (typeof part === 'number' || typeof part === 'boolean') return String(part);
    }
    if (Array.isArray(value.items)) return toDisplayText(value.items);
    if (Array.isArray(value.values)) return toDisplayText(value.values);
    for (const part of Object.values(value)) {
      if (typeof part === 'string' && part.trim()) return part.trim();
    }
    try {
      const json = JSON.stringify(value);
      return json && json !== '{}' && json !== 'null' && json !== '[]' ? json : '';
    } catch {
      return '';
    }
  }
  return '';
}

const BRAND_NAME_STOP = new Set([
  'organic',
  'fresh',
  'premium',
  'natural',
  'the',
  'new',
  'best',
  'pure',
  'farm',
  'daily',
  'home',
  'local',
  'super',
  'mini',
  'pack',
  'combo',
  'unknown',
  'n/a',
  'na',
  'none',
]);

/**
 * Infer a display brand from a product title when API/DB brand is missing
 * (e.g. "Kapiva Organic Cow Ghee", "GOLD WINNER SUNFLOWER OIL").
 */
export function inferBrandFromProductName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';

  let i = 0;
  while (i < tokens.length && BRAND_NAME_STOP.has(tokens[i].toLowerCase().replace(/[^a-z0-9]/g, ''))) {
    i += 1;
  }
  if (i >= tokens.length) return '';

  const first = tokens[i];
  const second = tokens[i + 1];
  const isAllCaps = (t) => /^[A-Z0-9][A-Z0-9&'.-]{1,}$/.test(t) && /[A-Z]/.test(t);
  const isTitle = (t) => /^[A-Z][A-Za-z0-9&'.-]{2,}$/.test(t);

  if (isAllCaps(first)) {
    if (second && isAllCaps(second) && !BRAND_NAME_STOP.has(second.toLowerCase())) {
      return `${first} ${second}`;
    }
    return first;
  }
  if (isTitle(first) && !BRAND_NAME_STOP.has(first.toLowerCase())) {
    // Avoid treating single-word produce names as brands ("Apple", "Orange").
    if (tokens.length <= i + 1) return '';
    return first;
  }
  return '';
}

/**
 * Resolve brand label from storefront / Yaadro / nested API shapes.
 * Skips placeholder "Unknown". Falls back to name inference when `allowInfer`.
 */
export function resolveProductBrand(apiProduct, { allowInfer = true } = {}) {
  if (!apiProduct || typeof apiProduct !== 'object') return '';
  const direct = [
    apiProduct.brand,
    apiProduct.brand_name,
    apiProduct.brandName,
    apiProduct.brand_label,
    apiProduct.brandLabel,
  ]
    .map((v) => toDisplayText(v))
    .find(Boolean);
  let label = direct || '';
  if (label && label.toLowerCase() === 'unknown') label = '';
  if (!label && allowInfer) {
    label = inferBrandFromProductName(
      apiProduct.name || apiProduct.title || apiProduct.product_name || ''
    );
  }
  if (label && label.toLowerCase() === 'unknown') return '';
  return label;
}

/**
 * Final pass so every product leaving transformProduct is safe to render as text.
 * Mutates and returns the same object for call-site convenience.
 */
export function sanitizeProductUiFields(product) {
  if (!product || typeof product !== 'object') return product;

  product.name = toDisplayText(product.name) || toDisplayText(product.shortName) || 'Product';
  product.shortName = toDisplayText(product.shortName) || product.name;
  product.brand = resolveProductBrand(product, { allowInfer: !toDisplayText(product.brand) });
  product.category = toDisplayText(product.category);
  product.categoryName = toDisplayText(product.categoryName) || product.category;
  product.subcategory = toDisplayText(product.subcategory);
  product.primaryCategoryName = toDisplayText(product.primaryCategoryName);
  product.description = toDisplayText(product.description);
  product.ingredients = toDisplayText(product.ingredients);
  product.packSize = toDisplayText(product.packSize);
  product.shelfLife = toDisplayText(product.shelfLife);
  product.countryOfOrigin = toDisplayText(product.countryOfOrigin);
  product.warranty = toDisplayText(product.warranty);
  product.deliveryTimeEstimate = toDisplayText(product.deliveryTimeEstimate) || null;
  product.storageInstructions = toDisplayText(product.storageInstructions) || null;
  product.allergenInformation = toDisplayText(product.allergenInformation) || null;
  product.vegNonVeg =
    product.vegNonVeg == null || product.vegNonVeg === ''
      ? null
      : toDisplayText(product.vegNonVeg) || null;

  if (
    product.nutritionalInformation != null &&
    typeof product.nutritionalInformation !== 'string' &&
    typeof product.nutritionalInformation !== 'object'
  ) {
    product.nutritionalInformation = toDisplayText(product.nutritionalInformation) || null;
  }

  if (Array.isArray(product.tags)) {
    product.tags = product.tags.map((t) => toDisplayText(t)).filter(Boolean);
  }

  if (Array.isArray(product.frequentlyBoughtTogether)) {
    product.frequentlyBoughtTogether = product.frequentlyBoughtTogether.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return sanitizeProductUiFields({ ...item });
    });
  }

  return product;
}
