function escapeIlikeTerm(value: string): string {
  return value.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Contains-match pattern for `ILIKE ... ESCAPE '\\'`. Null when the term is empty. */
export function toIlikePattern(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  return `%${escapeIlikeTerm(value)}%`;
}
