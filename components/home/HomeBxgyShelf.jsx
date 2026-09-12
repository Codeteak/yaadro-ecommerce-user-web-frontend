'use client';

import ProductCarousel from '../ProductCarousel';

/**
 * Buy X get Y home shelf: separate Buy and Get rows so cross-SKU deals are clear.
 */
export default function HomeBxgyShelf({
  title,
  subtitle,
  buyProducts = [],
  getProducts = [],
  buyQty,
  getQty,
}) {
  const buy = Array.isArray(buyProducts) ? buyProducts : [];
  const get = Array.isArray(getProducts) ? getProducts : [];
  if (!buy.length && !get.length) return null;

  const buyIds = new Set(buy.map((p) => String(p.id)));
  const getIds = new Set(get.map((p) => String(p.id)));
  const sameSet =
    buy.length > 0 &&
    get.length === buy.length &&
    [...buyIds].every((id) => getIds.has(id));

  const qtyLabel =
    Number.isFinite(Number(buyQty)) && Number.isFinite(Number(getQty))
      ? `Buy ${buyQty} get ${getQty}`
      : subtitle || '';

  // Same SKU BOGO: one carousel (products already carry real bundleRules from API).
  if (sameSet || (buy.length > 0 && get.length === 0)) {
    return (
      <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5">
        <div className="mb-4 md:mb-5 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
            {title}
          </h2>
          {qtyLabel ? (
            <p className="mt-2 text-[13px] md:text-sm text-gray-500">{qtyLabel}</p>
          ) : null}
        </div>
        <ProductCarousel products={buy.length ? buy : get} cardVariant="shelf" compact />
      </section>
    );
  }

  return (
    <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5 space-y-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
          {title}
        </h2>
        {qtyLabel ? (
          <p className="mt-2 text-[13px] md:text-sm text-gray-500">{qtyLabel}</p>
        ) : null}
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
            Get free
          </p>
          <ProductCarousel products={get} cardVariant="shelf" compact />
        </div>
      ) : null}
    </section>
  );
}
