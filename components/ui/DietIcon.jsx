export function VegIcon({ className = '' }) {
  return (
    <span
      className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border-2 border-[#008000] bg-white ${className}`.trim()}
      aria-label="Vegetarian"
      role="img"
    >
      <span className="size-1.5 rounded-full bg-[#008000]" aria-hidden />
    </span>
  );
}

export function NonVegIcon({ className = '' }) {
  return (
    <span
      className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border-2 border-[#8B4513] bg-white ${className}`.trim()}
      aria-label="Non-vegetarian"
      role="img"
    >
      <span
        className="size-0 border-r-[3px] border-b-[5px] border-l-[3px] border-r-transparent border-b-[#8B4513] border-l-transparent"
        aria-hidden
      />
    </span>
  );
}

export function DietIcon({ isVeg, className = '' }) {
  return isVeg ? <VegIcon className={className} /> : <NonVegIcon className={className} />;
}

export function resolveProductDiet(product) {
  const raw = String(product?.vegNonVeg || product?.veg_non_veg || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (raw === 'veg' || raw === 'vegetarian') return 'veg';
  if (raw === 'non_veg' || raw === 'nonveg' || raw === 'non_vegetarian') return 'non_veg';
  return null;
}
