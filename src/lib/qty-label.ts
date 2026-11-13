/**
 * Compact quantity badge labels for cart / order lines.
 * Derives kg | g | each | ml | l from the product unit string when present.
 */

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export type QtyBadgeInput = {
  /** Packs, or kilograms when `isWeight`. */
  qty: number;
  isWeight?: boolean;
  /** Free-form catalog unit, e.g. "per kg", "750 ml", "12 pcs". */
  unit?: string | null;
};

/**
 * Badge text: `1.5 kg`, `500 g`, `2 each`, `2×750ml`, `1×1l`, …
 */
export function formatQtyBadge({ qty, isWeight, unit }: QtyBadgeInput): string {
  const u = (unit ?? "").trim();

  if (isWeight) {
    if (qty > 0 && qty < 1) {
      return `${Math.round(qty * 1000)} g`;
    }
    return `${formatAmount(qty)} kg`;
  }

  const n = formatAmount(qty);
  if (!u) return `${n} each`;

  const lower = u.toLowerCase();

  if (/^per\s*kg$/i.test(u) || /^kg$/i.test(u)) {
    return `${n} kg`;
  }

  if (/\beach\b/i.test(u) || /\bpcs?\b/i.test(u) || /\bpack\b/i.test(u)) {
    return `${n} each`;
  }

  const sized = lower.match(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg)\b/);
  if (sized) {
    return `${n}×${sized[1]}${sized[2]}`;
  }

  if (/\bml\b/i.test(u)) return `${n} ml`;
  if (/(^|\s)l\b/i.test(u)) return `${n} l`;
  if (/\bg\b/i.test(u)) return `${n} g`;
  if (/\bkg\b/i.test(u)) return `${n} kg`;

  return `${n} each`;
}
