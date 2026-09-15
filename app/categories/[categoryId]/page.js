import CategoryBrowseClient from './CategoryBrowseClient';
import {
  BUILD_FALLBACK_CATEGORY_SLUGS,
  fetchCategorySlugsAtBuildTime,
  warnBuildApiUnavailable,
} from '../../../utils/buildTimeApi';

/** Cloudflare Pages static export only — EC2/`next start` resolves any slug at runtime. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

// Server builds: allow /categories/beauty (etc.) without rebuilding when admin adds a category.
// Static export: only pre-rendered paths exist.
export const dynamicParams = !useStaticExport;

export async function generateStaticParams() {
  // Live Node deploy: skip prebuild; CategoryBrowseClient loads the tree from DB/API.
  if (!useStaticExport) return [];

  try {
    const slugs = await fetchCategorySlugsAtBuildTime();
    const ids = slugs.length ? slugs : BUILD_FALLBACK_CATEGORY_SLUGS;
    return ids.map((categoryId) => ({ categoryId: String(categoryId) }));
  } catch (err) {
    warnBuildApiUnavailable('Category tree', err);
    return BUILD_FALLBACK_CATEGORY_SLUGS.map((categoryId) => ({ categoryId }));
  }
}

export default function CategoryBrowsePage() {
  return <CategoryBrowseClient />;
}
