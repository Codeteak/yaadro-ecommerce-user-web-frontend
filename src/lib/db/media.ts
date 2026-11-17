/** Turn a stored media key into a public URL. Absolute URLs are kept. */
export function toPublicMediaUrl(storageKey: unknown): string | null {
  const raw = typeof storageKey === "string" ? storageKey.trim() : "";
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const key = raw.replace(/^\/+/, "");
  if (!key) return null;
  const base = (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}
