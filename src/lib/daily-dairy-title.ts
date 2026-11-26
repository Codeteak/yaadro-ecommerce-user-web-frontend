/**
 * Title keywords that mark a home shelf as dairy (case-insensitive).
 * Includes admin default “Daily Diary” (Diary) as well as Dairy.
 */
const DAIRY_TITLE_RE =
  /\b(dairy|diary|daily\s*dairy|daily\s*diary|milk\s*(&|and)?\s*eggs?)\b/i;

export function isDairySectionTitle(title: string): boolean {
  return DAIRY_TITLE_RE.test(title.trim());
}
