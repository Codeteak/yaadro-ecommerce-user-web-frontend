import CategoryCard from './CategoryCard';

export default function CategoryGrid({ categories }) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-4 w-full max-w-full overflow-x-hidden">
      {categories.map((category) => (
        <CategoryCard key={category?.id ?? category?.name ?? category} category={category} />
      ))}
    </div>
  );
}

