import CategoryBrowseClient from './CategoryBrowseClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function CategoryBrowsePage() {
  return <CategoryBrowseClient />;
}
