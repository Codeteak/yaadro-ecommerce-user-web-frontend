/**
 * Frontend aisle grouping for the Categories page.
 * Presentation only — does not change category IDs, hrefs, or API shape.
 *
 * New root categories auto-land in a section when their name/slug matches
 * aisle keywords; unmatched go to "More".
 */

/** @typedef {{ id: string, title: string, keywords: string[] }} AisleDef */

/** Ordered aisles (excluding the More catch-all). */
export const CATEGORY_AISLES = /** @type {AisleDef[]} */ ([
  {
    id: 'fresh',
    title: 'Fresh',
    keywords: ['fruit', 'fruits', 'vegetable', 'vegetables', 'veggies', 'veg'],
  },
  {
    id: 'dairy-bakery',
    title: 'Dairy & Bakery',
    keywords: ['dairy', 'milk', 'bakery', 'bread', 'egg', 'eggs'],
  },
  {
    id: 'snacks-sweets',
    title: 'Snacks & Sweets',
    keywords: [
      'chip',
      'chips',
      'namkeen',
      'namkeens',
      'biscuit',
      'biscuits',
      'chocolate',
      'chocolates',
      'sweet',
      'sweets',
      'icecream',
      'ice cream',
      'ice-cream',
      'cookie',
      'cookies',
    ],
  },
  {
    id: 'drinks',
    title: 'Drinks',
    keywords: [
      'beverage',
      'beverages',
      'drink',
      'drinks',
      'juice',
      'water',
      'nutritional',
      'nutrition',
      'horlicks',
      'bournvita',
      'tea',
      'coffee',
      'functional',
    ],
  },
  {
    id: 'cooking-staples',
    title: 'Cooking staples',
    keywords: [
      'masala',
      'masalas',
      'sauce',
      'sauces',
      'ketchup',
      'noodle',
      'noodles',
      'ready to cook',
      'ready-to-cook',
      'grocery',
      'groceries',
      'atta',
      'flour',
      'rice',
      'oil',
      'spice',
      'spices',
    ],
  },
  {
    id: 'home-personal',
    title: 'Home & personal care',
    keywords: [
      'household',
      'fragrance',
      'personal care',
      'personal-care',
      'cleaning',
      'toiletries',
      'detergent',
    ],
  },
]);

export const MORE_AISLE_ID = 'more';
export const MORE_AISLE_TITLE = 'More';

/**
 * Normalize category name/slug for keyword matching.
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeCategoryLabel(input) {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{ name?: string, slug?: string } | null | undefined} category
 * @returns {boolean}
 */
export function isAllBrowseCategory(category) {
  const name = normalizeCategoryLabel(category?.name);
  const slug = normalizeCategoryLabel(category?.slug);
  return name === 'all' || slug === 'all' || slug === 'all categories';
}

/**
 * Build a searchable haystack from name + slug.
 * @param {{ name?: string, slug?: string } | null | undefined} category
 * @returns {string}
 */
function categoryHaystack(category) {
  const name = normalizeCategoryLabel(category?.name);
  const slug = normalizeCategoryLabel(category?.slug);
  return [name, slug].filter(Boolean).join(' ');
}

/**
 * Whether haystack matches a keyword (word-boundary for short tokens like "veg" / "oil").
 * @param {string} haystack
 * @param {string} keyword
 */
function haystackMatchesKeyword(haystack, keyword) {
  const k = normalizeCategoryLabel(keyword);
  if (!k || !haystack) return false;
  if (haystack === k) return true;
  // Multi-word keywords (e.g. "ice cream", "personal care")
  if (k.includes(' ') && haystack.includes(k)) return true;
  const words = haystack.split(' ');
  for (const word of words) {
    if (word === k) return true;
    // Longer keywords: allow plurals / compounds (biscuit→biscuits, icecream→icecreams)
    if (k.length >= 4 && (word.startsWith(k) || k.startsWith(word) && word.length >= 4)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve aisle id for one category (More if unmatched). Never returns for "All" pin — callers handle that.
 * @param {{ name?: string, slug?: string } | null | undefined} category
 * @returns {string}
 */
export function resolveCategoryAisleId(category) {
  if (isAllBrowseCategory(category)) return MORE_AISLE_ID;
  const haystack = categoryHaystack(category);
  for (const aisle of CATEGORY_AISLES) {
    for (const keyword of aisle.keywords) {
      if (haystackMatchesKeyword(haystack, keyword)) return aisle.id;
    }
  }
  return MORE_AISLE_ID;
}

/**
 * Group root categories into aisle sections for the Categories page.
 * Empty aisles are omitted. "All" is pinned as the first tile of the first non-empty aisle.
 *
 * @param {Array<{ id?: string, name?: string, slug?: string }>} categories
 * @returns {Array<{ id: string, title: string, categories: typeof categories }>}
 */
export function groupCategoriesIntoAisles(categories) {
  const list = Array.isArray(categories) ? categories.filter(Boolean) : [];
  if (list.length === 0) return [];

  const allPins = [];
  const rest = [];
  for (const cat of list) {
    if (isAllBrowseCategory(cat)) allPins.push(cat);
    else rest.push(cat);
  }

  /** @type {Map<string, typeof list>} */
  const buckets = new Map();
  for (const aisle of CATEGORY_AISLES) {
    buckets.set(aisle.id, []);
  }
  buckets.set(MORE_AISLE_ID, []);

  for (const cat of rest) {
    const aisleId = resolveCategoryAisleId(cat);
    const bucket = buckets.get(aisleId) || buckets.get(MORE_AISLE_ID);
    bucket.push(cat);
  }

  /** @type {Array<{ id: string, title: string, categories: typeof list }>} */
  const sections = [];
  for (const aisle of CATEGORY_AISLES) {
    const cats = buckets.get(aisle.id) || [];
    if (cats.length === 0) continue;
    sections.push({ id: aisle.id, title: aisle.title, categories: cats });
  }
  const more = buckets.get(MORE_AISLE_ID) || [];
  if (more.length > 0) {
    sections.push({ id: MORE_AISLE_ID, title: MORE_AISLE_TITLE, categories: more });
  }

  // Pin "All" as the first tile under the first non-empty aisle (or its own Browse strip).
  if (allPins.length > 0) {
    if (sections.length === 0) {
      sections.push({
        id: 'browse',
        title: 'Browse',
        categories: allPins,
      });
    } else {
      sections[0] = {
        ...sections[0],
        categories: [...allPins, ...sections[0].categories],
      };
    }
  }

  return sections;
}
