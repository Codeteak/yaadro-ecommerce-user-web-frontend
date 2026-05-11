import {
  getCartLinePreviewImageSrc,
  getResolvedProductImageUrls,
  PRODUCT_IMAGE_PLACEHOLDER,
} from './productImages';

export function cartLineSizeKey(item) {
  if (item?.selectedSize && typeof item.selectedSize === 'object') {
    const w = item.selectedSize.weight;
    const u = item.selectedSize.unit;
    if (w != null && u != null && String(u)) return `${w}${u}`;
  }
  return 'default';
}

export function cartLinesMatch(a, b) {
  const pa = a?.productId ?? a?.product?.id ?? a?.id;
  const pb = b?.productId ?? b?.product?.id ?? b?.id;
  if (pa == null || pb == null) return false;
  if (String(pa) !== String(pb)) return false;
  return cartLineSizeKey(a) === cartLineSizeKey(b);
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

  const leanProduct = {
    id: productId ?? id,
    name: product.name,
    imageUrls: realUrls.length ? realUrls.slice(0, 12) : undefined,
    thumbnailUrl: typeof product.thumbnailUrl === 'string' ? product.thumbnailUrl : undefined,
    imageUrl: product.imageUrl ?? product.image_url ?? undefined,
    image: typeof product.image === 'string' ? product.image : undefined,
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
    sizeDisplay: product.sizeDisplay,
    unit: product.unit,
    weight: product.weight,
    brand: product.brand,
    category,
    product: leanProduct,
    cartItemKey,
  };
}

export function addOrMergeCartLine(prevItems, persistableLine, addQty) {
  const safeAdd = Math.max(1, Number(addQty) || 1);
  const key = persistableLine.cartItemKey;
  const idx = prevItems.findIndex((it) => {
    const ik = it.cartItemKey ?? `${it.id ?? it.productId}_${cartLineSizeKey(it)}`;
    return ik === key;
  });
  if (idx === -1) {
    return [...prevItems, { ...persistableLine, quantity: safeAdd }];
  }
  return prevItems.map((row, i) => {
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
    const hint = client.find((c) => cartLinesMatch(s, c));
    if (!hint) return s;
    const sSrc = getCartLinePreviewImageSrc(s);
    const hSrc = getCartLinePreviewImageSrc(hint);
    const sid = String(s.cartItemId ?? s.id ?? '');
    const hid = String(hint.cartItemId ?? hint.id ?? '');
    const idsMatch = sid.length > 0 && hid.length > 0 && sid === hid;
    const sq = Number(s.quantity) || 1;
    const hq = Number(hint.quantity);
    // While PATCH/DELETE is in flight, TanStack cache may still hold old qty — prefer matching client line.
    const quantity =
      idsMatch && Number.isFinite(hq) && hq !== sq ? hq : sq;
    const base =
      sSrc !== PRODUCT_IMAGE_PLACEHOLDER || hSrc === PRODUCT_IMAGE_PLACEHOLDER
        ? { ...s, name: s.name || hint.name, quantity, cartItemKey: hint.cartItemKey ?? s.cartItemKey }
        : {
            ...s,
            name: s.name || hint.name,
            quantity,
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
