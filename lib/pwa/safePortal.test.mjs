import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/**
 * Lightweight DOM stubs so ensurePortalRoot can be unit-tested in Node.
 */
function installDomStub() {
  const body = { isConnected: true, childNodes: [], appendChild() {} };
  const shell = { id: 'app-shell', isConnected: true, childNodes: [], appendChild() {} };
  const nodes = new Map([
    ['app-shell', shell],
  ]);

  body.appendChild = function appendChild(el) {
    if (el.parentNode && el.parentNode !== body) {
      const kids = el.parentNode.childNodes;
      const i = kids.indexOf(el);
      if (i >= 0) kids.splice(i, 1);
    }
    el.parentNode = body;
    this.childNodes.push(el);
    if (el.id) nodes.set(el.id, el);
    return el;
  };
  shell.appendChild = function appendChild(el) {
    if (el.parentNode && el.parentNode !== shell) {
      const kids = el.parentNode.childNodes;
      const i = kids.indexOf(el);
      if (i >= 0) kids.splice(i, 1);
    }
    el.parentNode = shell;
    this.childNodes.push(el);
    if (el.id) nodes.set(el.id, el);
    return el;
  };

  globalThis.document = {
    body,
    getElementById(id) {
      return nodes.get(id) || null;
    },
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        id: '',
        style: { cssText: '' },
        parentNode: null,
        isConnected: true,
        childNodes: [],
        setAttribute() {},
      };
      return el;
    },
  };

  return { body, shell, nodes };
}

test('ensurePortalRoot attaches to connected app-shell', async () => {
  const { shell, nodes } = installDomStub();
  const { ensurePortalRoot, PORTAL_ROOT_ID } = await import('./safePortal.js');
  const root = ensurePortalRoot();
  assert.ok(root);
  assert.equal(root.id, PORTAL_ROOT_ID);
  assert.equal(root.parentNode, shell);
  assert.equal(nodes.get(PORTAL_ROOT_ID), root);
});

test('ensurePortalRoot re-parents when shell disconnects', async () => {
  const { body, shell, nodes } = installDomStub();
  const { ensurePortalRoot, PORTAL_ROOT_ID } = await import('./safePortal.js');
  const root = ensurePortalRoot();
  assert.equal(root.parentNode, shell);

  shell.isConnected = false;
  nodes.delete('app-shell');
  const again = ensurePortalRoot();
  assert.equal(again, root);
  assert.equal(again.parentNode, body);
});
