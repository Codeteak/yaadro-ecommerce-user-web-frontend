/**
 * Group order lines into paid parent + free/reward children (cart OfferGroupCard shape).
 */

import {
  getOrderFreeRewardParentId,
  inferOrderLinePaidQuantity,
  isConfirmedFreeRewardLine,
  parseOrderQuantity,
} from "./orderPromotions";

/**
 * Same-SKU BOGO with free qty on the paid row stays a single parent (no separate child).
 * Unavailable free children stay nested under the parent when linkable.
 */
export function buildOrderOfferGroups(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return [];

  const isFree = (it) =>
    it.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(it);

  const paidLines = list.filter((it) => !isFree(it));
  const freeLines = list.filter((it) => isFree(it));
  const paidById = new Map(
    paidLines
      .filter((it) => it.id != null && String(it.id).trim())
      .map((it) => [String(it.id).trim(), it]),
  );

  const rewardsByParent = new Map();
  const orphanFrees = [];

  for (const free of freeLines) {
    let parentKey = getOrderFreeRewardParentId(free);
    if (parentKey && paidById.has(parentKey)) {
      const arr = rewardsByParent.get(parentKey) || [];
      arr.push(free);
      rewardsByParent.set(parentKey, arr);
      continue;
    }

    const freePromos = (free.appliedPromotionIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    if (freePromos.length) {
      const buys = paidLines.filter((buy) =>
        (buy.appliedPromotionIds || []).some((id) =>
          freePromos.includes(String(id)),
        ),
      );
      if (buys.length === 1 && buys[0].id != null) {
        parentKey = String(buys[0].id).trim();
        const arr = rewardsByParent.get(parentKey) || [];
        arr.push(free);
        rewardsByParent.set(parentKey, arr);
        continue;
      }
    }

    orphanFrees.push(free);
  }

  const groups = [];
  for (const it of paidLines) {
    const parentId = it.id != null ? String(it.id).trim() : "";
    const children = parentId ? rewardsByParent.get(parentId) || [] : [];
    const paidQty = inferOrderLinePaidQuantity(it);
    const displayQty = parseOrderQuantity(it.quantity);
    const freeOnParent = Math.max(0, displayQty - paidQty);
    groups.push({
      parentLineItemId: parentId || `parent-${groups.length}`,
      parent: it,
      children,
      isBxgy:
        children.length > 0 ||
        freeOnParent > 0 ||
        it.isBxgyBuyLine === true ||
        it.is_bxgy_buy_line === true,
      freeQuantity:
        freeOnParent ||
        children.reduce((s, c) => s + (Number(c.quantity) || 0), 0),
      paidQuantity: paidQty,
    });
  }

  for (const free of orphanFrees) {
    groups.push({
      parentLineItemId: String(free.id ?? `free-${groups.length}`),
      parent: free,
      children: [],
      isBxgy: true,
      freeQuantity: Number(free.quantity) || 1,
      paidQuantity: 0,
    });
  }

  return groups;
}
