'use client';

/**
 * Compact “add ₹X more for shop minimum” banner for cart / checkout / sidebar.
 */
export default function MinPurchaseBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5"
      role="status"
    >
      <p className="text-[12px] font-medium text-amber-950">{message}</p>
    </div>
  );
}
