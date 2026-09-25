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

test('applyShopFavicon removes shared icons and leaves only the shop image', () => {
  const nodes = [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/icons/pwa-192.png' },
  ];
  for (const node of nodes) {
    node.remove = () => {
      head.nodes = head.nodes.filter((item) => item !== node);
    };
  }
  const head = {
    nodes,
    querySelectorAll() {
      return this.nodes;
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
        setAttribute(key, value) {
          this.attrs[key] = value;
        },
      };
      return el;
    },
  };

  assert.equal(applyShopFavicon(doc, SHOP_LOGO), true);
  assert.deepEqual(
    head.nodes.map((node) =>
      node.attrs ? { rel: node.attrs.rel, href: node.attrs.href } : { rel: node.rel, href: node.href }
    ),
    [
      { rel: 'icon', href: SHOP_LOGO },
      { rel: 'apple-touch-icon', href: SHOP_LOGO },
    ]
  );
  assert.equal(applyShopFavicon(doc, ''), false);
});
