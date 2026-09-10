/**
 * Lightweight product image placeholder buckets + tints (listing first paint).
 */

const BUCKET_RULES = [
  {
    id: 'dairy',
    keywords: ['milk', 'dairy', 'curd', 'yogurt', 'yoghurt', 'butter', 'cheese', 'paneer', 'cream', 'lassi', 'ghee'],
  },
  {
    id: 'biscuit',
    keywords: ['biscuit', 'cookie', 'cookies', 'cracker', 'wafers', 'wafer'],
  },
  {
    id: 'oil',
    keywords: ['oil', 'sunflower', 'mustard oil', 'coconut oil', 'olive', 'refined oil'],
  },
  {
    id: 'staple',
    keywords: ['rice', 'atta', 'flour', 'dal', 'pulse', 'wheat', 'basmati', 'maida', 'rava', 'semolina', 'sugar', 'salt'],
  },
  {
    id: 'produce',
    keywords: [
      'fruit',
      'veg',
      'vegetable',
      'tomato',
      'onion',
      'potato',
      'apple',
      'banana',
      'mango',
      'carrot',
      'spinach',
      'leafy',
    ],
  },
];

const TINTS = [
  '#f5f3ff', // violet-50
  '#f0fdf4', // green-50
  '#fff7ed', // orange-50
  '#ecfeff', // cyan-50
  '#fdf2f8', // pink-50
  '#f8fafc', // slate-50
  '#fefce8', // yellow-50
  '#eef2ff', // indigo-50
];

function normalizeText(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase().trim())
    .join(' ');
}

/**
 * @param {{ name?: string, categoryName?: string, category?: string | { name?: string } }} opts
 * @returns {'dairy'|'biscuit'|'oil'|'staple'|'produce'|'default'}
 */
export function getProductImageBucket({ name, categoryName, category } = {}) {
  const catLabel =
    categoryName ||
    (typeof category === 'string' ? category : category?.name) ||
    '';
  const haystack = normalizeText(name, catLabel);
  if (!haystack) return 'default';

  for (const rule of BUCKET_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.id;
  }
  return 'default';
}

/** Stable pastel background from product name. */
export function getProductPlaceholderTint(name) {
  const s = String(name || '').trim();
  if (!s) return TINTS[0];
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length];
}
