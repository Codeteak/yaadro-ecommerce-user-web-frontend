/**
 * MiniSearch index helpers for local typeahead suggestions.
 */

import MiniSearch from 'minisearch';

const MINI_FUZZY = 0.4;

function cleanText(value) {
  return (value ?? '').toString().trim();
}

function searchTokens(product) {
  return [
    product?.name,
    product?.shortName,
    product?.brand,
    product?.category,
    product?.categoryName,
    product?.slug,
  ]
    .filter(Boolean)
    .map((v) => cleanText(v))
    .join(' ')
    .trim();
}

export function toMiniSearchDoc(product) {
  const id = product?.id != null ? String(product.id) : '';
  if (!id) return null;

  const slug = cleanText(product?.slug);
  const name = cleanText(product?.name) || cleanText(product?.shortName) || 'Product';
  const category = cleanText(product?.category);
  const brand = cleanText(product?.brand);

  return {
    id,
    slug,
    name,
    category,
    brand,
    text: searchTokens(product),
    product,
  };
}

export function buildMiniSearchIndex(products) {
  const docs = (Array.isArray(products) ? products : [])
    .map(toMiniSearchDoc)
    .filter(Boolean);

  const mini = new MiniSearch({
    idField: 'id',
    fields: ['name', 'category', 'brand', 'slug', 'text'],
    storeFields: ['id', 'slug', 'name', 'category', 'brand', 'product'],
    searchOptions: {
      prefix: true,
      fuzzy: MINI_FUZZY,
      boost: {
        name: 3,
        category: 1.4,
        brand: 1.2,
      },
    },
  });

  if (docs.length > 0) {
    mini.addAll(docs);
  }

  return { mini, docsCount: docs.length };
}

export function runMiniSearch(mini, query, limit = 8) {
  const q = cleanText(query);
  if (!mini || q.length < 2) return [];

  const hits = mini.search(q, {
    prefix: true,
    fuzzy: MINI_FUZZY,
    combineWith: 'OR',
  });

  return hits.slice(0, Math.max(1, limit));
}
