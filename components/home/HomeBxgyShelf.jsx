'use client';

import ProductCarousel from '../ProductCarousel';

/**
 * Annotate products so every card in a Damaka / BXGY shelf shows the correct deal chrome.
 * @param {'same_sku' | 'cross_sku'} offerMode
 */
function withBxgyShelfChrome(products, role, buyQty, getQty, offerMode) {
  const buy = Number.isFinite(Number(buyQty)) && Number(buyQty) > 0 ? Number(buyQty) : 1;
  const get = Number.isFinite(Number(getQty)) && Number(getQty) > 0 ? Number(getQty) : 1;
  return (Array.isArray(products) ? products : []).map((product) => ({
    ...product,
    bxgyShelfRole: role,
    bxgyBuyQty: buy,
    bxgyGetQty: get,
    bxgyOfferMode: offerMode,
  }));
}

/**
 * Buy X get Y home shelf.
 * - Same SKU (classic BOGO): one row, B1G1 / “Buy 1 Get 1 free” of the same product.
 * - Cross SKU: Buy these + Get free rows, “unlock free item” (never BOGO on buy cards).
 */
export default function HomeBxgyShelf({
  title,
  subtitle,
  buyProducts = [],
  getProducts = [],
  buyQty,
  getQty,
  dealMode: dealModeProp,
}) {
  const buyRaw = Array.isArray(buyProducts) ? buyProducts : [];
  const getRaw = Array.isArray(getProducts) ? getProducts : [];
  if (!buyRaw.length && !getRaw.length) return null;

  const buyIds = new Set(buyRaw.map((p) => String(p.id)));
  const getIds = new Set(getRaw.map((p) => String(p.id)));
  const sameSet =
    buyRaw.length > 0 &&
    getRaw.length === buyRaw.length &&
    [...buyIds].every((id) => getIds.has(id));

  // Prefer API dealMode; fall back to set comparison.
  let offerMode =
    dealModeProp === 'same_sku' || dealModeProp === 'cross_sku'
      ? dealModeProp
      : sameSet || (buyRaw.length > 0 && getRaw.length === 0)
        ? 'same_sku'
        : 'cross_sku';

  const buy = withBxgyShelfChrome(buyRaw, 'buy', buyQty, getQty, offerMode);
  const get = withBxgyShelfChrome(getRaw, 'get', buyQty, getQty, offerMode);

  const qtyShort =
    Number.isFinite(Number(buyQty)) && Number.isFinite(Number(getQty))
      ? `Buy ${buyQty} get ${getQty}`
      : '';

  if (offerMode === 'same_sku') {
    const sameLabel =
      Number.isFinite(Number(buyQty)) && Number.isFinite(Number(getQty))
        ? Number(buyQty) === 1 && Number(getQty) === 1
          ? 'Buy 1 get 1 free — same product'
          : `Buy ${buyQty} get ${getQty} free — same product`
        : subtitle || 'Buy get free — same product';

    return (
      <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5">
        <div className="mb-4 md:mb-5 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
            {title}
          </h2>
          <p className="mt-2 text-[13px] md:text-sm text-gray-500">{sameLabel}</p>
        </div>
        <ProductCarousel
          products={buy.length ? buy : get}
          cardVariant="shelf"
          compact
        />
      </section>
    );
  }

  const crossLabel = qtyShort
    ? `${qtyShort} — buy from this list, get a different product free below`
    : 'Buy from this list, get a different product free below';

  return (
    <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5 space-y-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
          {title}
        </h2>
        <p className="mt-2 text-[13px] md:text-sm text-gray-500">{crossLabel}</p>
      </div>

      {buy.length > 0 ? (
        <div>
          <p className="mb-3 px-4 sm:px-6 lg:px-8 text-sm font-semibold text-gray-700">
            Buy these
          </p>
          <ProductCarousel products={buy} cardVariant="shelf" compact />
        </div>
      ) : null}

      {get.length > 0 ? (
        <div>
          <p className="mb-3 px-4 sm:px-6 lg:px-8 text-sm font-semibold text-gray-700">
            Get free (different products)
          </p>
          <ProductCarousel products={get} cardVariant="shelf" compact />
        </div>
      ) : null}
    </section>
  );
}
