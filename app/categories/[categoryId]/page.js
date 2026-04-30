import CategoryBrowseClient from './CategoryBrowseClient';

export async function generateStaticParams() {
  // Keep export builds working even if API isn't reachable at build time.
  // In local dev we allow dynamic params; in production export we attempt to pre-render known slugs.
  if (process.env.NODE_ENV !== 'production') return [];

  try {
    const { getCategoriesTree } = await import('../../../utils/productApi');
    const tree = await getCategoriesTree();

    const out = [];
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        const slugOrId = n?.slug || n?.id;
        if (slugOrId) out.push({ categoryId: String(slugOrId) });
        if (n?.children?.length) walk(n.children);
      });
    };
    walk(tree);

    return out.length ? out : [{ categoryId: '__placeholder__' }];
  } catch {
    return [{ categoryId: '__placeholder__' }];
  }
}

export const dynamicParams = process.env.NODE_ENV !== 'production';

export default function CategoryBrowsePage() {
  return <CategoryBrowseClient />;
}
