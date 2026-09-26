import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Lightweight DOM stubs so ensurePortalRoot can be unit-tested in Node.
 */
function installDomStub() {
  const body = { isConnected: true, childNodes: [], appendChild() {} };
  const shell = { id: 'app-shell', isConnected: true, childNodes: [], appendChild() {}, contains() {} };
  const nodes = new Map([['app-shell', shell]]);

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
  shell.contains = function contains(node) {
    if (!node) return false;
    let cur = node;
    while (cur) {
      if (cur === shell) return true;
      cur = cur.parentNode;
    }
    return false;
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

test('ensurePortalRoot attaches to document.body, not app-shell', async () => {
  const { body, shell, nodes } = installDomStub();
  // Bust module cache so tests see a fresh module against this DOM stub.
  const modPath = new URL('./safePortal.js', import.meta.url).href;
  const { ensurePortalRoot, PORTAL_ROOT_ID } = await import(`${modPath}?t=${Date.now()}-1`);
  const root = ensurePortalRoot();
  assert.ok(root);
  assert.equal(root.id, PORTAL_ROOT_ID);
  assert.equal(root.parentNode, body);
  assert.notEqual(root.parentNode, shell);
  assert.equal(nodes.get(PORTAL_ROOT_ID), root);
});

test('ensurePortalRoot migrates host out of app-shell onto body', async () => {
  const { body, shell, nodes } = installDomStub();
  const modPath = new URL('./safePortal.js', import.meta.url).href;
  const { ensurePortalRoot, PORTAL_ROOT_ID } = await import(`${modPath}?t=${Date.now()}-2`);

  const stray = document.createElement('div');
  stray.id = PORTAL_ROOT_ID;
  shell.appendChild(stray);
  assert.equal(stray.parentNode, shell);
  assert.ok(shell.contains(stray));

  const again = ensurePortalRoot();
  assert.equal(again, stray);
  assert.equal(again.parentNode, body);
  assert.equal(nodes.get(PORTAL_ROOT_ID), again);
});

test('resolvePortalHost rejects app-shell as preferred host', async () => {
  const { body, shell } = installDomStub();
  const modPath = new URL('./safePortal.js', import.meta.url).href;
  const { ensurePortalRoot, resolvePortalHost, PORTAL_ROOT_ID } = await import(
    `${modPath}?t=${Date.now()}-3`
  );
  const root = ensurePortalRoot();
  assert.equal(resolvePortalHost(shell), root);
  assert.equal(root.parentNode, body);
  assert.equal(root.id, PORTAL_ROOT_ID);
});
