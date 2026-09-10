'use client';

import {
  getProductImageBucket,
  getProductPlaceholderTint,
} from '../../utils/productPlaceholderGraphic';

/** Soft filled multi-item compositions (~60% of box). */

function IconOil() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* back bottles */}
      <g opacity="0.55">
        <path
          d="M14 12h5v5l3 3v28a3 3 0 01-3 3h-5a3 3 0 01-3-3V20l3-3v-5z"
          fill="#c4b5fd"
          stroke="#7c3aed"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M14 36h5" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
        <path
          d="M42 10h5v5l3 3v30a3 3 0 01-3 3h-5a3 3 0 01-3-3V18l3-3v-5z"
          fill="#c4b5fd"
          stroke="#7c3aed"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M42 34h5" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* front bottle */}
      <path
        d="M28 8h8v6l4 4v32a4 4 0 01-4 4h-8a4 4 0 01-4-4V18l4-4V8z"
        fill="#ddd6fe"
        stroke="#6d28d9"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="28" y="30" width="8" height="10" rx="1" fill="#a78bfa" opacity="0.85" />
      <path d="M30 6h4" stroke="#6d28d9" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconDairy() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* carton */}
      <path
        d="M12 16h18l2 4v30a3 3 0 01-3 3H13a3 3 0 01-3-3V20l2-4z"
        fill="#bfdbfe"
        stroke="#2563eb"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M12 22h18M18 12h6v4" stroke="#2563eb" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="16" y="28" width="10" height="12" rx="1" fill="#93c5fd" />
      {/* bottle */}
      <path
        d="M38 14h10l2 5v29a4 4 0 01-4 4H40a4 4 0 01-4-4V19l2-5z"
        fill="#e0e7ff"
        stroke="#4f46e5"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M40 10h6M38 22h10" stroke="#4f46e5" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="43" cy="36" rx="4" ry="6" fill="#a5b4fc" opacity="0.9" />
    </svg>
  );
}

function IconBiscuit() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* pack behind */}
      <rect
        x="10"
        y="12"
        width="28"
        height="36"
        rx="4"
        fill="#fed7aa"
        stroke="#ea580c"
        strokeWidth="1.3"
      />
      <rect x="14" y="18" width="20" height="10" rx="2" fill="#fdba74" />
      <path d="M16 34h16M16 39h12" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* biscuits in front */}
      <circle cx="42" cy="28" r="9" fill="#fde68a" stroke="#d97706" strokeWidth="1.3" />
      <circle cx="42" cy="28" r="2" fill="#d97706" opacity="0.35" />
      <circle cx="48" cy="42" r="8" fill="#fcd34d" stroke="#d97706" strokeWidth="1.3" />
      <circle cx="48" cy="42" r="1.8" fill="#d97706" opacity="0.35" />
      <circle cx="34" cy="44" r="7" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
      <circle cx="34" cy="44" r="1.5" fill="#d97706" opacity="0.35" />
    </svg>
  );
}

function IconStaple() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* back bag */}
      <path
        d="M28 14h22l-3 36H31L28 14z"
        fill="#bbf7d0"
        stroke="#16a34a"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path d="M32 14c0-5 3-8 7-8s7 3 7 8" stroke="#16a34a" strokeWidth="1.3" fill="none" />
      {/* front bag */}
      <path
        d="M10 18h24l-2.5 34H12.5L10 18z"
        fill="#86efac"
        stroke="#15803d"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M14 18c0-6 3.5-10 8-10s8 4 8 10" stroke="#15803d" strokeWidth="1.4" fill="none" />
      <rect x="16" y="30" width="12" height="10" rx="1.5" fill="#4ade80" opacity="0.85" />
    </svg>
  );
}

function IconProduce() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* apple */}
      <path
        d="M22 44c7 0 12-5 12-12 0-8-6-13-12-14-6 1-12 6-12 14 0 7 5 12 12 12z"
        fill="#fca5a5"
        stroke="#dc2626"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M22 16v5M19 19c1.5 1.5 4.5 1.5 6 0" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" />
      {/* orange */}
      <circle cx="44" cy="36" r="11" fill="#fdba74" stroke="#ea580c" strokeWidth="1.3" />
      <circle cx="44" cy="36" r="3" fill="#ea580c" opacity="0.25" />
      {/* leafy */}
      <ellipse
        cx="36"
        cy="50"
        rx="10"
        ry="5"
        fill="#86efac"
        stroke="#16a34a"
        strokeWidth="1.2"
        transform="rotate(-18 36 50)"
      />
    </svg>
  );
}

function IconDefault() {
  return (
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" aria-hidden>
      {/* stacked boxes */}
      <rect x="22" y="10" width="26" height="16" rx="2" fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.2" opacity="0.7" />
      <rect x="16" y="22" width="28" height="18" rx="2" fill="#ddd6fe" stroke="#6d28d9" strokeWidth="1.3" />
      {/* bag in front */}
      <path
        d="M12 32h28l-2 20H14L12 32z"
        fill="#c4b5fd"
        stroke="#5b21b6"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M18 32v-4a6 6 0 0112 0v4" stroke="#5b21b6" strokeWidth="1.4" fill="none" />
      <rect x="20" y="40" width="12" height="6" rx="1" fill="#a78bfa" />
    </svg>
  );
}

const ICONS = {
  dairy: IconDairy,
  biscuit: IconBiscuit,
  oil: IconOil,
  staple: IconStaple,
  produce: IconProduce,
  default: IconDefault,
};

/**
 * Instant L0 product image placeholder (inline SVG collection, no network).
 */
export default function ProductPlaceholderGraphic({
  name = '',
  categoryName = '',
  className = '',
}) {
  const bucket = getProductImageBucket({ name, categoryName });
  const tint = getProductPlaceholderTint(name);
  const Icon = ICONS[bucket] || IconDefault;

  return (
    <div
      className={`flex h-full w-full items-center justify-center text-violet-500/80 ${className}`.trim()}
      style={{ backgroundColor: tint }}
      aria-hidden
    >
      <Icon />
    </div>
  );
}
