/**
 * Initials for the signed-in avatar chip.
 * "Priya Nair" → "PN", "Arun" → "AR", empty → "Y".
 */

export function profileInitials(
  name: string | null | undefined,
  fallback = "Y",
): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return fallback.slice(0, 2).toUpperCase();

  if (parts.length === 1) {
    const word = parts[0]!;
    return word.slice(0, 2).toUpperCase();
  }

  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}
