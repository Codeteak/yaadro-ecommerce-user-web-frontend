import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyShopFavicon,
  faviconLinksForShop,
  replaceFaviconLinksInHtml,
} from './shopFavicon.js';

const SHOP_LOGO = 'https://cdn.example/shops/daily-diary.png';

test('faviconLinksForShop uses the shop image for tab and apple icons', () => {
  assert.deepEqual(faviconLinksForShop(SHOP_LOGO), [
    { rel: 'icon', href: SHOP_LOGO },
    { rel: 'apple-touch-icon', href: SHOP_LOGO },
  ]);
  assert.equal(faviconLinksForShop('  '), null);
  assert.equal(faviconLinksForShop(null), null);
});

test('replaceFaviconLinksInHtml swaps every static icon for the shop image', () => {
  const html = `<head><link rel="icon" href="/favicon.ico"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/pwa-192.png"><title>Store</title></head>`;
  const out = replaceFaviconLinksInHtml(html, SHOP_LOGO);
  assert.equal(out.includes('/favicon.ico'), false);
  assert.equal(out.includes('/favicon.svg'), false);
  assert.equal(out.includes('/icons/pwa-192.png'), false);
  assert.equal(out.includes(`rel="icon" href="${SHOP_LOGO}"`), true);
  assert.equal(out.includes(`rel="apple-touch-icon" href="${SHOP_LOGO}"`), true);
  assert.equal(out.includes('<title>Store</title>'), true);
});

test('replaceFaviconLinksInHtml keeps the fallback when the shop has no image', () => {
  const html = `<head><link rel="icon" href="/favicon.ico"></head>`;
  assert.equal(replaceFaviconLinksInHtml(html, ''), html);
  assert.equal(replaceFaviconLinksInHtml(html, null), html);
});

test('replaceFaviconLinksInHtml escapes a shop image url', () => {
  const out = replaceFaviconLinksInHtml(
    '<head></head>',
    'https://cdn.example/logo.png?a=1&b=2'
  );
  assert.equal(out.includes('href="https://cdn.example/logo.png?a=1&amp;b=2"'), true);
});

test('applyShopFavicon suppresses shared icons without removing them', () => {
  const nodes = [
    {
      rel: 'icon',
      href: '/favicon.ico',
      attrs: {},
      hasAttribute(key) {
        return Object.prototype.hasOwnProperty.call(this.attrs, key);
      },
      setAttribute(key, value) {
        this.attrs[key] = value;
      },
      removeAttribute(key) {
        delete this.attrs[key];
      },
    },
    {
      rel: 'apple-touch-icon',
      href: '/icons/pwa-192.png',
      attrs: {},
      hasAttribute(key) {
        return Object.prototype.hasOwnProperty.call(this.attrs, key);
      },
      setAttribute(key, value) {
        this.attrs[key] = value;
      },
      removeAttribute(key) {
        delete this.attrs[key];
      },
    },
  ];
  const head = {
    nodes,
    querySelector(sel) {
      const m = String(sel).match(/data-yaadro-shop-favicon="([^"]+)"/);
      if (!m) return null;
      return this.nodes.find((n) => n.attrs?.['data-yaadro-shop-favicon'] === m[1]) || null;
    },
    querySelectorAll() {
      return this.nodes.filter(
        (n) =>
          n.rel === 'icon' ||
          n.rel === 'shortcut icon' ||
          n.rel === 'apple-touch-icon' ||
          n.attrs?.rel === 'icon' ||
          n.attrs?.rel === 'apple-touch-icon'
      );
    },
    appendChild(el) {
      this.nodes.push(el);
    },
  };
  const doc = {
    head,
    createElement() {
      const el = {
        attrs: {},
        hasAttribute(key) {
          return Object.prototype.hasOwnProperty.call(this.attrs, key);
        },
        setAttribute(key, value) {
          this.attrs[key] = value;
          if (key === 'rel') this.rel = value;
          if (key === 'href') this.href = value;
        },
        removeAttribute(key) {
          delete this.attrs[key];
        },
      };
      return el;
    },
  };

  assert.equal(applyShopFavicon(doc, SHOP_LOGO), true);
  // Original Next-owned icons stay in the tree (suppressed, not removed).
  assert.equal(nodes[0].attrs.media, 'not all');
  assert.equal(nodes[0].attrs['data-yaadro-favicon-suppressed'], '1');
  assert.equal(nodes[1].attrs.media, 'not all');
  const shopLinks = head.nodes.filter((n) => n.attrs?.['data-yaadro-shop-favicon']);
  assert.equal(shopLinks.length, 2);
  assert.equal(shopLinks[0].attrs.href, SHOP_LOGO);
  assert.equal(shopLinks[1].attrs.href, SHOP_LOGO);
  assert.equal(applyShopFavicon(doc, ''), false);
});
