'use client';

export default function ProductSort({ sortBy, onSortChange }) {
  const sortOptions = [
    { value: 'default', label: 'Default' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'newest', label: 'Newest First' },
    { value: 'rating', label: 'Customer Ratings' },
    { value: 'discount', label: 'Discount Percentage' },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}


