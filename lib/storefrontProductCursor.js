/**
 * Opaque product list cursor — same shape as customer API
 * (`{ t: created_at ISO, id }` as base64url).
 */

export function encodeStorefrontProductCursor(createdAt, id) {
  if (createdAt == null || id == null || id === '') return null;
  const t = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
  if (!t.trim()) return null;
  return Buffer.from(JSON.stringify({ t, id: String(id) }), 'utf8').toString('base64url');
}

/** @returns {{ createdAt: string, id: string } | null} */
export function decodeStorefrontProductCursor(cursor) {
  if (cursor == null || !String(cursor).trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor).trim(), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const t = parsed.t != null ? String(parsed.t).trim() : '';
    const id = parsed.id != null ? String(parsed.id).trim() : '';
    if (!t || !id) return null;
    return { createdAt: t, id };
  } catch {
    return null;
  }
}
