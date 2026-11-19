/**
 * Map shop `customer_address` payloads onto order detail Deliver to / Address rows.
 * Checkout saves `{ line1, line2, landmark, city, raw }` on the customer.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function addressLabel(value: unknown): { label: string; detail: string } {
  if (typeof value === "string" && value.trim() && !value.trim().startsWith("{")) {
    return { label: "Deliver to", detail: value.trim() };
  }
  const row = asRecord(value);
  if (!row) return { label: "Delivery address", detail: "" };

  const raw = pickText(row.raw, row.formatted, row.full_address, row.fullAddress);
  const line1 = pickText(
    row.line1,
    row.line_1,
    row.house,
    row.building,
    row.address_line1,
    row.addressLine1,
  );
  const line2 = pickText(
    row.line2,
    row.line_2,
    row.street,
    row.address_line2,
    row.addressLine2,
  );
  const landmark = pickText(row.landmark, row.area);
  const city = pickText(row.city, row.town);
  const pin = pickText(row.pin, row.pincode, row.postal_code, row.zip);

  const detailParts = [line2, landmark, city, pin].filter(Boolean);
  if (line1) {
    return {
      label: line1,
      detail: detailParts.length > 0 ? detailParts.join(", ") : raw && raw !== line1 ? raw : "",
    };
  }
  if (raw) {
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    return {
      label: parts[0] ?? raw,
      detail: parts.slice(1).join(", "),
    };
  }
  if (detailParts.length > 0) {
    return {
      label: detailParts[0]!,
      detail: detailParts.slice(1).join(", "),
    };
  }
  return { label: "Delivery address", detail: "" };
}
