import CategoryBrowseClient from './CategoryBrowseClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ categoryId: '__placeholder__' }];
}

export default function CategoryBrowsePage() {
  return <CategoryBrowseClient />;
}
