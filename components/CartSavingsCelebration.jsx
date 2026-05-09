'use client';

import { useMemo } from 'react';

const COLORS = [
  '#e879f9',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#fb7185',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#86efac',
  '#fcd34d',
];

/** Mini confetti burst clipped to the floating cart pill — pair with in-pill flash in `FloatingViewCartPill`. */
export default function CartSavingsCelebration({ burstKey }) {
  const particles = useMemo(() => {
    if (!burstKey) return [];
    const n = 28;
    return Array.from({ length: n }, (_, i) => ({
      id: `${burstKey}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 0.85 + Math.random() * 0.65,
      color: COLORS[i % COLORS.length],
      w: 4 + Math.random() * 6,
      h: 5 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 56,
      rotEnd: 240 + Math.random() * 420,
      rounded: Math.random() > 0.35,
    }));
  }, [burstKey]);

  if (!burstKey || particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-full"
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="cart-savings-celebration-piece--pill absolute opacity-95 shadow-sm"
          style={{
            left: `${p.left}%`,
            top: '-12%',
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.rounded ? '9999px' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--confetti-drift']: `${p.drift}px`,
            ['--confetti-rot']: `${p.rotEnd}deg`,
          }}
        />
      ))}
    </div>
  );
}
