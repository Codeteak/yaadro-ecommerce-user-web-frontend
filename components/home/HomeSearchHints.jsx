'use client';

import { useEffect, useMemo, useState } from 'react';

const FALLBACK_HINTS = ['Milk', 'Bananas', 'Bread', 'Eggs', 'Tomatoes', 'Atta'];

export default function HomeSearchHints({ productNames = [] }) {
  const hints = useMemo(() => {
    const fromCatalog = [
      ...new Set(
        productNames
          .map((name) => String(name || '').trim())
          .filter((name) => name.length > 1 && name.length < 28)
      ),
    ].slice(0, 8);
    return fromCatalog.length >= 3 ? fromCatalog : FALLBACK_HINTS;
  }, [productNames]);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (hints.length < 2) return undefined;

    let fadeTimer;
    const cycle = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % hints.length);
        setVisible(true);
      }, 280);
    }, 2300);

    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(fadeTimer);
    };
  }, [hints]);

  return (
    <span
      aria-hidden="true"
      className={`min-w-0 truncate text-[13px] text-gray-400 transition-opacity duration-300 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      Search “{hints[index] || FALLBACK_HINTS[0]}”
    </span>
  );
}
