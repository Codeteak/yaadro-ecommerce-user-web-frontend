/**
 * Address display / geocode helpers for the storefront.
 * Avoids duplicating city/state/PIN/country when line2 already holds a long map string.
 */

function norm(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function lower(value) {
  return norm(value).toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip trailing admin fragments (city / state / PIN / country) from a street line
 * when those values also exist as separate fields (legacy duplicated saves).
 * @param {string} street
 * @param {object} address
 * @returns {string}
 */
function stripTrailingAdminFromStreet(street, address) {
  let s = norm(street);
  if (!s || !address) return s;
  const tails = [
    address.country,
    address.postalCode || address.zipCode,
    address.state,
    address.city,
  ]
    .map(norm)
    .filter(Boolean);
  // Repeat a few times — order in the string can vary slightly.
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const tail of tails) {
      const re = new RegExp(`,\\s*${escapeRegExp(tail)}\\s*$`, 'i');
      const next = s.replace(re, '').trim();
      if (next !== s) {
        s = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s;
}

/**
 * Deduplicate address fragments (case-insensitive; skip if already contained).
 * @param {Array<string|null|undefined>} parts
 * @returns {string[]}
 */
export function dedupeAddressParts(parts) {
  const out = [];
  for (const raw of parts) {
    const part = norm(raw);
    if (!part) continue;
    const p = lower(part);
    const already = out.some((existing) => {
      const e = lower(existing);
      return e === p || e.includes(p) || p.includes(e);
    });
    if (!already) out.push(part);
  }
  return out;
}

/**
 * Street / area only from reverse-geocode — never the full displayName
 * (that includes city, state, PIN, country and causes duplication).
 * @param {object|null|undefined} resolved
 * @returns {string}
 */
export function buildMapStreetArea(resolved) {
  if (!resolved) return '';
  return dedupeAddressParts([resolved.line1, resolved.line2]).join(', ');
}

/**
 * Clean a stored line2 / street that may still contain city/state/PIN/country.
 * @param {string} street
 * @param {object} address
 * @returns {string}
 */
export function sanitizeStoredStreetArea(street, address) {
  return stripTrailingAdminFromStreet(street, address);
}

/**
 * User-facing single-line address. Omits state, PIN, and country.
 * @param {object|null|undefined} address
 * @returns {string}
 */
export function formatAddressDisplay(address) {
  if (!address) return '';
  const rawStreet =
    [address.line1, address.line2].filter((p) => norm(p)).join(', ') ||
    address.street ||
    address.address ||
    '';
  const street = stripTrailingAdminFromStreet(rawStreet, address);
  return dedupeAddressParts([street, address.landmark, address.city]).join(', ');
}

/**
 * Multi-line text for share / clipboard (no state / PIN / country).
 * @param {object|null|undefined} address
 * @param {{ name?: string, phone?: string }} [opts]
 * @returns {string}
 */
export function formatAddressShareText(address, opts = {}) {
  if (!address) return '';
  const rawStreet =
    [address.line1, address.line2].filter((p) => norm(p)).join(', ') ||
    address.street ||
    address.address ||
    '';
  const street = stripTrailingAdminFromStreet(rawStreet, address);
  const lines = dedupeAddressParts([
    opts.name || address.fullName,
    street,
    address.landmark,
    address.city,
  ]);
  const phone = norm(opts.phone || address.phone);
  if (phone) lines.push(phone);
  return lines.join('\n');
}
