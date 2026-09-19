/**
 * Group order lines into paid parent + free/reward children (cart OfferGroupCard shape).
 */

import { rewardProductIdFromRule } from "./bxgyLabels";
import {
  getOrderFreeRewardParentId,
  inferOrderLinePaidQuantity,
  isConfirmedFreeRewardLine,
  parseOrderQuantity,
} from "./orderPromotions";
import {
  getPrimaryBundleRule,
  isCrossSkuBundleRule,
} from "./productUtils";

function orderLineProductIdKey(it) {
  const raw =
    it?.productId ?? it?.product_id ?? it?.product?.id ?? it?.shop_product_id;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim().toLowerCase();
}

/** Free units earned by same-SKU BXGY for this paid qty (display only). */
function impliedSameSkuFreeQty(it, paidQty) {
  const paid = Number(paidQty);
  if (!(paid > 0)) return 0;
  const rule = getPrimaryBundleRule(it?.product || it);
  if (!rule || isCrossSkuBundleRule(rule)) return 0;
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (!(buy > 0 && get > 0)) return 0;
  if (reward && String(reward).toLowerCase() !== "free") return 0;
  return Math.floor(paid / buy) * get;
}

function makeSyntheticFreeChild(parent, freeQty) {
  const list = Number(parent.listPrice ?? parent.unitPrice) || 0;
  return {
    id: `${parent.id ?? "line"}:bxgy-free`,
    productName: parent.productName || parent.name,
    name: parent.productName || parent.name,
    productId: parent.productId,
    product_id: parent.productId,
    product: parent.product,
    image: parent.image,
    quantity: freeQty,
    unitPrice: 0,
    price: 0,
    totalPrice: 0,
    listPrice: list > 0 ? list : null,
    isConfirmedFreeReward: true,
    is_confirmed_free_reward: true,
    isBundleReward: true,
    packLabel: parent.packLabel,
    unitLabel: parent.unitLabel,
    appliedPromotionIds: parent.appliedPromotionIds || [],
    _syntheticBxgyFree: true,
  };
}

/**
 * Paid parent + FREE Get children. Same-SKU free qty on the paid row (or implied by
 * catalog B1G1 rules) becomes a nested FREE child for display — payables unchanged.
 * Cross-SKU FREE / Get lines nest under the matching Buy parent when linkable.
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
  const nestedPaidIds = new Set();
  const orphanFrees = [];

  const attach = (parentKey, free) => {
    const arr = rewardsByParent.get(parentKey) || [];
    arr.push(free);
    rewardsByParent.set(parentKey, arr);
  };

  for (const free of freeLines) {
    let parentKey = getOrderFreeRewardParentId(free);
    if (parentKey && paidById.has(parentKey)) {
      attach(parentKey, free);
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
        attach(String(buys[0].id).trim(), free);
        continue;
      }
      if (buys.length > 1) {
        const freePid = orderLineProductIdKey(free);
        const byReward = buys.filter((buy) => {
          const rule = getPrimaryBundleRule(buy.product || buy);
          if (!rule || !isCrossSkuBundleRule(rule)) return false;
          const rewardId = rewardProductIdFromRule(rule);
          return (
            freePid &&
            rewardId &&
            String(rewardId).trim().toLowerCase() === freePid
          );
        });
        if (byReward.length === 1 && byReward[0].id != null) {
          attach(String(byReward[0].id).trim(), free);
          continue;
        }
      }
    }

    const freePid = orderLineProductIdKey(free);
    if (freePid) {
      const buyMatches = paidLines.filter((buy) => {
        const rule = getPrimaryBundleRule(buy.product || buy);
        if (!rule || !isCrossSkuBundleRule(rule)) return false;
        const rewardId = rewardProductIdFromRule(rule);
        return (
          rewardId && String(rewardId).trim().toLowerCase() === freePid
        );
      });
      if (buyMatches.length === 1 && buyMatches[0].id != null) {
        attach(String(buyMatches[0].id).trim(), free);
        continue;
      }
    }

    orphanFrees.push(free);
  }

  // Production orders often omit parent id / shared promo / bundleRules on the
  // Buy line. If there is exactly one paid line, nest every orphan FREE under it
  // (Ghee buy → Upma FREE). Safe: only one possible parent.
  if (orphanFrees.length > 0 && paidLines.length === 1) {
    const onlyPaid = paidLines[0];
    const buyId =
      onlyPaid.id != null && String(onlyPaid.id).trim()
        ? String(onlyPaid.id).trim()
        : "__solo_paid__";
    onlyPaid._offerGroupParentKey = buyId;
    for (const free of orphanFrees) {
      attach(buyId, free);
    }
    orphanFrees.length = 0;
  } else if (orphanFrees.length === 1 && paidLines.length > 1) {
    // One FREE + several paid: prefer the unique cross-SKU buy whose reward
    // matches; else the unique line flagged as BXGY buy.
    const free = orphanFrees[0];
    const freePid = orderLineProductIdKey(free);
    let parent = null;
    if (freePid) {
      const byReward = paidLines.filter((buy) => {
        const rule = getPrimaryBundleRule(buy.product || buy);
        if (!rule || !isCrossSkuBundleRule(rule)) return false;
        const rewardId = rewardProductIdFromRule(rule);
        return (
          rewardId && String(rewardId).trim().toLowerCase() === freePid
        );
      });
      if (byReward.length === 1) parent = byReward[0];
    }
    if (!parent) {
      const bxgyBuys = paidLines.filter(
        (buy) =>
          buy.isBxgyBuyLine === true || buy.is_bxgy_buy_line === true,
      );
      if (bxgyBuys.length === 1) parent = bxgyBuys[0];
    }
    if (parent) {
      const buyId =
        parent.id != null && String(parent.id).trim()
          ? String(parent.id).trim()
          : "__bxgy_buy__";
      parent._offerGroupParentKey = buyId;
      attach(buyId, free);
      orphanFrees.length = 0;
    }
  }

  // Cross-SKU: nest a paid Get line under its Buy parent (display hierarchy).
  for (const buy of paidLines) {
    const buyId = buy.id != null ? String(buy.id).trim() : "";
    if (!buyId) continue;
    const rule = getPrimaryBundleRule(buy.product || buy);
    if (!rule || !isCrossSkuBundleRule(rule)) continue;
    const rewardId = rewardProductIdFromRule(rule);
    if (!rewardId) continue;
    const rewardKey = String(rewardId).trim().toLowerCase();
    const gets = paidLines.filter((getLine) => {
      if (getLine === buy) return false;
      const gid = getLine.id != null ? String(getLine.id).trim() : "";
      if (!gid || nestedPaidIds.has(gid)) return false;
      return orderLineProductIdKey(getLine) === rewardKey;
    });
    if (gets.length === 1) {
      const getLine = gets[0];
      const gid = String(getLine.id).trim();
      nestedPaidIds.add(gid);
      // Prefer FREE presentation when payable is zero; otherwise nest as-is.
      const asChild =
        Number(getLine.totalPrice) < 0.01
          ? {
              ...getLine,
              isConfirmedFreeReward: true,
              unitPrice: 0,
              totalPrice: 0,
            }
          : getLine;
      attach(buyId, asChild);
    }
  }

  const groups = [];
  for (const it of paidLines) {
    const parentId =
      (it.id != null && String(it.id).trim()) ||
      (it._offerGroupParentKey ? String(it._offerGroupParentKey) : "") ||
      "";
    if (parentId && nestedPaidIds.has(parentId)) continue;

    const existing = parentId ? rewardsByParent.get(parentId) || [] : [];
    const paidQty = inferOrderLinePaidQuantity(it);
    const displayQty = parseOrderQuantity(it.quantity);
    const freeOnParent = Math.max(0, displayQty - paidQty);
    const impliedFree =
      existing.length > 0 ? 0 : impliedSameSkuFreeQty(it, paidQty);
    const freeQty = freeOnParent > 0 ? freeOnParent : impliedFree;

    const children = [...existing];
    if (freeQty > 0 && !children.some((c) => c._syntheticBxgyFree)) {
      children.push(makeSyntheticFreeChild(it, freeQty));
    }

    // Parent row shows paid qty when free is nested as a child.
    const parentForDisplay =
      freeQty > 0 && paidQty > 0 && paidQty < displayQty + impliedFree
        ? {
            ...it,
            quantity: paidQty,
            // Keep money on paid qty only (already totalPrice × paid).
          }
        : freeQty > 0 && impliedFree > 0 && displayQty <= paidQty + 1e-9
          ? { ...it, quantity: paidQty }
          : it;

    groups.push({
      parentLineItemId: parentId || `parent-${groups.length}`,
      parent: parentForDisplay,
      children,
      isBxgy:
        children.length > 0 ||
        freeOnParent > 0 ||
        it.isBxgyBuyLine === true ||
        it.is_bxgy_buy_line === true,
      freeQuantity:
        freeQty ||
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
