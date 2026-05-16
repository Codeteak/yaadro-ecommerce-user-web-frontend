/** Convert API minor units (paise) to major (INR). */
export function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

/** Parse minor amount from API (integer paise). */
export function parseMinorInt(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/** Format minor units as INR for display (no decimals when whole rupees). */
export function formatInrFromMinor(minor) {
  const major = minorToMajor(minor);
  const rounded = Math.round(major * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `₹${rounded.toLocaleString('en-IN')}`;
  }
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
