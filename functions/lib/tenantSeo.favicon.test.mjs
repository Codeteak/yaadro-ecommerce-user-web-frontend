import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectSeoIntoHtml, shopImageFromResolve } from './tenantSeo.js';

const SHOP_LOGO = 'https://cdn.example/shops/daily-diary.png';
const PRODUCT_PHOTO = 'https://cdn.example/products/atta.jpg';

const HTML = `<html><head><link rel="icon" href="/favicon.ico"><link rel="icon" href="/favicon.svg"><link rel="apple-touch-icon" href="/icons/pwa-192.png"><title>Online Grocery</title></head><body></body></html>`;

test('shopImageFromResolve reads the shop logo fields', () => {
  assert.equal(shopImageFromResolve({ shopImage: SHOP_LOGO }), SHOP_LOGO);
  assert.equal(shopImageFromResolve({ shop_image: SHOP_LOGO }), SHOP_LOGO);
  assert.equal(shopImageFromResolve({ logo_url: SHOP_LOGO }), SHOP_LOGO);
  assert.equal(shopImageFromResolve({}), '');
  assert.equal(shopImageFromResolve(null), '');
});

test('injectSeoIntoHtml uses the shop image as favicon, not the share photo', () => {
  const out = injectSeoIntoHtml(
    HTML,
    {
      title: 'Atta | Daily Diary',
      description: 'Buy atta',
      locale: 'en_IN',
      og: { type: 'product', image: PRODUCT_PHOTO, imageAlt: 'Atta' },
      twitter: { card: 'summary_large_image' },
    },
    { shopName: 'Daily Diary', shopImage: SHOP_LOGO, hostname: 'dailydiary.example' }
  );

  assert.equal(out.includes(SHOP_LOGO), true);
  assert.equal(out.includes('rel="icon" href="' + SHOP_LOGO + '"'), true);
  assert.equal(out.includes('/favicon.ico'), false);
  assert.equal(out.includes('/favicon.svg'), false);
  assert.equal(out.includes('rel="icon" href="' + PRODUCT_PHOTO + '"'), false);
  assert.equal(out.includes(`content="${PRODUCT_PHOTO}"`), true);
});

test('injectSeoIntoHtml keeps the shared fallback when the shop has no image', () => {
  const out = injectSeoIntoHtml(
    HTML,
    {
      title: 'Daily Diary',
      description: 'Groceries',
      locale: 'en_IN',
      og: { type: 'website', image: '' },
      twitter: { card: 'summary' },
    },
    { shopName: 'Daily Diary', shopImage: '', hostname: 'dailydiary.example' }
  );
  assert.equal(out.includes('/favicon.ico'), true);
});
