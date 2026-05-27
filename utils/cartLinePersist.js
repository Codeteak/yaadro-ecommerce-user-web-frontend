import {
  getCartLinePreviewImageSrc,
  getResolvedProductImageUrls,
  PRODUCT_IMAGE_PLACEHOLDER,
} from './productImages';
import {
  applyGuestCartBundleQuantities,
  isBundleRewardCartLine,
  readLineFreeQuantity,
  stripPaidCartLinesOnly,
} from './cartPromotions';
import { formatWeightUnitLabel, resolveProductWeightAndUnit } from './productUtils';

export function cartLineSizeKey(item) {
  if (item?.selectedSize && typeof item.selectedSize === 'object') {
    const w = item.selectedSize.weight;
    const u = item.selectedSize.unit;
    if (w != null && u != null && String(u)) return `${w}${u}`;
  }
  const { weight, unit } = resolveProductWeightAndUnit(item);
  const pack = formatWeightUnitLabel(weight, unit);
  return pack || 'default';
}

export function cartLinesMatch(a, b) {
  const aBundle = isBundleRewardCartLine(a);
  const bBundle = isBundleRewardCartLine(b);
  if (aBundle !== bBundle) return false;

  if (aBundle && bBundle) {
    const idA = String(a?.cartItemId ?? a?.id ?? '');
    const idB = String(b?.cartItemId ?? b?.id ?? '');
    if (idA && idB && idA === idB) return true;
    const srcA = a?.bundleSourceCartItemId ?? a?.bundle_source_cart_item_id;
    const srcB = b?.bundleSourceCartItemId ?? b?.bundle_source_cart_item_id;
    return (
      srcA != null &&
      srcB != null &&
      String(srcA) === String(srcB) &&
      cartLineSizeKey(a) === cartLineSizeKey(b)
    );
  }

  const pa = a?.productId ?? a?.product?.id ?? a?.id;
  const pb = b?.productId ?? b?.product?.id ?? b?.id;
  if (pa == null || pb == null) return false;
  if (String(pa) !== String(pb)) return false;
  return cartLineSizeKey(a) === cartLineSizeKey(b);
}

/** Paid cart row for a product (ignores `:bundle-reward` free lines). */
export function findPaidCartLine(cartItems, productId, selectedSize = null) {
  if (!Array.isArray(cartItems) || productId == null) return null;
  const sizeKey = selectedSize
    ? `${selectedSize.weight}${selectedSize.unit}`
    : 'default';
  return (
    cartItems.find((item) => {
      if (isBundleRewardCartLine(item)) return false;
      const pid = item.productId ?? item.product?.id ?? item.id;
      if (String(pid) !== String(productId)) return false;
      return cartLineSizeKey(item) === sizeKey;
    }) ?? null
  );
}

/** Paid lines first; each free bundle line directly under its paid parent. */
/** Paid lines only, with bundle free/display fields for optimistic cart UI. */
export function syncPaidCartCacheLines(serverLines, localLines = []) {
  const server = stripPaidCartLinesOnly(serverLines);
  const local = stripPaidCartLinesOnly(localLines);
  const merged =
    server.length > 0 ? mergeServerCartWithLocalLines(server, local) : local;
  return applyGuestCartBundleQuantities(stripPaidCartLinesOnly(merged));
}

export function sortCartItemsForDisplay(items) {
  if (!Array.isArray(items) || !items.length) return [];
  const paid = items.filter((it) => !isBundleRewardCartLine(it));
  const rewards = items.filter((it) => isBundleRewardCartLine(it));
  const out = [];
  const usedRewardIds = new Set();

  for (const p of paid) {
    out.push(p);
    const parentId = String(p.cartItemId ?? p.id ?? '');
    for (const r of rewards) {
      const rid = String(r.cartItemId ?? r.id ?? '');
      if (usedRewardIds.has(rid)) continue;
      const src = String(
        r.bundleSourceCartItemId ??
          r.bundle_source_item_id ??
          r.bundle_source_cart_item_id ??
          ''
      );
      if (src && parentId && src === parentId) {
        out.push(r);
        usedRewardIds.add(rid);
      }
    }
  }

  for (const r of rewards) {
    const rid = String(r.cartItemId ?? r.id ?? '');
    if (!usedRewardIds.has(rid)) out.push(r);
  }

  return out;
}

/**
 * Build a compact cart line from a storefront product (or cart-like object) so localStorage
 * and optimistic UI always have stable string URLs — no raw media blobs only.
 */
export function buildPersistableCartLineFromProduct(product) {
  if (!product || typeof product !== 'object') return null;

  const id = product.id ?? product.productId;
  const productId = product.productId ?? product.id;
  if (id == null && productId == null) return null;

  const urls = getResolvedProductImageUrls(product);
  const realUrls = urls.filter((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER);
  const primary = realUrls[0] || urls[0] || PRODUCT_IMAGE_PLACEHOLDER;

  const selectedSize = product.selectedSize ?? null;
  const sizeKey = cartLineSizeKey({ selectedSize });
  const cartItemKey = `${id ?? productId}_${sizeKey}`;

  const price =
    Number(product.price ?? product.offerPriceEffective ?? product.offerPrice ?? 0) || 0;
  const op = product.originalPrice ?? product.compareAtPrice;
  const originalPrice =
    op != null && Number.isFinite(Number(op)) ? Number(op) : undefined;

  const category =
    typeof product.category === 'string'
      ? product.category
      : product.category?.name ?? product.categoryName ?? undefined;

  const bundleRules =
    product.bundleRules ??
    product.bundle_rules ??
    (Array.isArray(product.product?.bundleRules) ? product.product.bundleRules : null);

  const { weight, unit } = resolveProductWeightAndUnit(product);
  const packLabel = formatWeightUnitLabel(weight, unit);
  const unitSize = product.unit_size ?? product.unitSize;

  const leanProduct = {
    id: productId ?? id,
    name: product.name,
    imageUrls: realUrls.length ? realUrls.slice(0, 12) : undefined,
    thumbnailUrl: typeof product.thumbnailUrl === 'string' ? product.thumbnailUrl : undefined,
    imageUrl: product.imageUrl ?? product.image_url ?? undefined,
    image: typeof product.image === 'string' ? product.image : undefined,
    ...(Array.isArray(bundleRules) && bundleRules.length ? { bundleRules } : {}),
  };

  return {
    id: id ?? productId,
    productId: productId ?? id,
    name: product.name || '',
    slug: product.slug || undefined,
    price,
    originalPrice,
    image: primary,
    ...(realUrls.length > 1 ? { imageUrls: realUrls } : {}),
    image_snapshot: primary !== PRODUCT_IMAGE_PLACEHOLDER ? primary : undefined,
    selectedSize,
    sizeDisplay: product.sizeDisplay || packLabel || undefined,
    unit,
    weight,
    ...(unitSize != null ? { unit_size: unitSize } : {}),
    brand: product.brand,
    category,
    product: leanProduct,
    cartItemKey,
    ...(Array.isArray(bundleRules) && bundleRules.length ? { bundleRules } : {}),
  };
}

export function addOrMergeCartLine(prevItems, persistableLine, addQty) {
  const safeAdd = Math.max(1, Number(addQty) || 1);
  const paidOnly = (Array.isArray(prevItems) ? prevItems : []).filter(
    (it) => !isBundleRewardCartLine(it)
  );
  const key = persistableLine.cartItemKey;
  const idx = paidOnly.findIndex((it) => {
    const ik = it.cartItemKey ?? `${it.id ?? it.productId}_${cartLineSizeKey(it)}`;
    return ik === key;
  });
  if (idx === -1) {
    return [...paidOnly, { ...persistableLine, quantity: safeAdd }];
  }
  return paidOnly.map((row, i) => {
    if (i !== idx) return row;
    return {
      ...row,
      ...persistableLine,
      quantity: (Number(row.quantity) || 1) + safeAdd,
      cartItemId: row.cartItemId,
      cartItemKey: row.cartItemKey ?? persistableLine.cartItemKey,
    };
  });
}

/**
 * Server cart rows enriched with client image snapshots; append optimistic rows not yet on server.
 */
export function mergeServerCartWithLocalLines(serverLines, localLines) {
  const server = Array.isArray(serverLines) ? serverLines : [];
  const client = Array.isArray(localLines) ? localLines : [];
  if (!server.length) return client;

  const enriched = server.map((s) => {
    if (isBundleRewardCartLine(s)) return s;
    const hint = client.find((c) => cartLinesMatch(s, c));
    if (!hint) return s;
    const sSrc = getCartLinePreviewImageSrc(s);
    const hSrc = getCartLinePreviewImageSrc(hint);
    const sid = String(s.cartItemId ?? s.id ?? '');
    const hid = String(hint.cartItemId ?? hint.id ?? '');
    const idsMatch = sid.length > 0 && hid.length > 0 && sid === hid;
    const sq = Number(s.quantity) || 1;
    const hq = Number(hint.quantity);
    // While PATCH is in flight, TanStack cache may still hold old qty / offer_quantity — prefer client.
    const clientQtyWins = idsMatch && Number.isFinite(hq) && hq !== sq;
    const quantity = clientQtyWins ? hq : sq;
    const freeQuantity = clientQtyWins
      ? readLineFreeQuantity(hint)
      : readLineFreeQuantity(s) || readLineFreeQuantity(hint);
    const displayQuantity = clientQtyWins
      ? Math.max(quantity, Number(hint.displayQuantity) || quantity + freeQuantity)
      : Math.max(
          quantity,
          Number(s.displayQuantity) || Number(hint.displayQuantity) || quantity + freeQuantity
        );

    const base =
      sSrc !== PRODUCT_IMAGE_PLACEHOLDER || hSrc === PRODUCT_IMAGE_PLACEHOLDER
        ? {
            ...s,
            name: s.name || hint.name,
            quantity,
            displayQuantity,
            freeQuantity,
            offer_quantity: freeQuantity,
            offerQuantity: freeQuantity,
            free_quantity: freeQuantity,
            display_quantity: displayQuantity,
            paid_quantity: quantity,
            cartItemKey: hint.cartItemKey ?? s.cartItemKey,
          }
        : {
            ...s,
            name: s.name || hint.name,
            quantity,
            displayQuantity,
            freeQuantity,
            offer_quantity: freeQuantity,
            offerQuantity: freeQuantity,
            free_quantity: freeQuantity,
            display_quantity: displayQuantity,
            paid_quantity: quantity,
            cartItemKey: hint.cartItemKey ?? s.cartItemKey,
            image: hint.image,
            imageUrls: hint.imageUrls ?? hint.images,
            images: hint.images ?? hint.imageUrls,
            thumbnailUrl: hint.thumbnailUrl,
            image_snapshot: hint.image_snapshot ?? hint.image,
            product:
              typeof hint.product === 'object' && hint.product
                ? { ...(typeof s.product === 'object' && s.product ? s.product : {}), ...hint.product }
                : s.product,
          };
    return base;
  });

  const pending = client.filter(
    (c) => !c.cartItemId && !server.some((s) => cartLinesMatch(s, c))
  );

  /** Lines already on the API client (have cartItemId) but missing from this server snapshot — e.g. first GET after add before replica catches up. */
  const orphanWithId = client.filter((c) => {
    if (!c?.cartItemId) return false;
    const cid = String(c.cartItemId ?? c.id ?? '');
    if (!cid) return false;
    return !server.some(
      (s) =>
        String(s.cartItemId ?? s.id ?? '') === cid || cartLinesMatch(s, c)
    );
  });

  return [...enriched, ...pending, ...orphanWithId];
}

export function persistCartLinesImmediate(items, storageKey) {
  if (typeof window === 'undefined' || !storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
    localStorage.setItem('cartLastActivity', Date.now().toString());
  } catch (e) {
    console.warn('Cart persist failed', e);
  }
}

/** Rollback metadata for a single add operation (before optimistic apply). */
export function buildAddRollbackTarget(prevItems, persistableLine, addQty) {
  const key = persistableLine.cartItemKey;
  const prevLine = prevItems.find(
    (it) => (it.cartItemKey ?? `${it.id ?? it.productId}_${cartLineSizeKey(it)}`) === key
  );
  if (!prevLine) {
    return { kind: 'removeNew', key };
  }
  return { kind: 'revertQty', key, qty: Number(prevLine.quantity) || 1 };
}

export function applyAddRollback(prevItems, rollback) {
  if (rollback.kind === 'removeNew') {
    return prevItems.filter(
      (it) => (it.cartItemKey ?? `${it.id ?? it.productId}_${cartLineSizeKey(it)}`) !== rollback.key
    );
  }
  return prevItems.map((it) =>
    (it.cartItemKey ?? `${it.id ?? it.productId}_${cartLineSizeKey(it)}`) === rollback.key
      ? { ...it, quantity: rollback.qty }
      : it
  );
}
