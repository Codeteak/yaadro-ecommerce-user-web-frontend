import CategoryBrowseClient from './CategoryBrowseClient';
import {
  BUILD_FALLBACK_CATEGORY_SLUGS,
  fetchCategorySlugsAtBuildTime,
  warnBuildApiUnavailable,
} from '../../../utils/buildTimeApi';

export async function generateStaticParams() {
  // Keep export builds working even if API isn't reachable at build time.
  if (process.env.NODE_ENV !== 'production') return [];

  try {
    const slugs = await fetchCategorySlugsAtBuildTime();
    const ids = slugs.length ? slugs : BUILD_FALLBACK_CATEGORY_SLUGS;
    return ids.map((categoryId) => ({ categoryId: String(categoryId) }));
  } catch (err) {
    warnBuildApiUnavailable('Category tree', err);
    return BUILD_FALLBACK_CATEGORY_SLUGS.map((categoryId) => ({ categoryId }));
  }
}

export const dynamicParams = process.env.NODE_ENV !== 'production';

export default function CategoryBrowsePage() {
  return <CategoryBrowseClient />;
}
