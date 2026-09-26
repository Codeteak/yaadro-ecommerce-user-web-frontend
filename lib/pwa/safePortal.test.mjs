import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Lightweight DOM stubs so ensurePortalRoot can be unit-tested in Node.
 * Mirrors production rule: portal root pins to document.body and is never moved.
 */
function installDomStub() {
  const body = { tagName: 'BODY', childNodes: [], appendChild() {} };
  const shell = { id: 'app-shell', tagName: 'DIV', childNodes: [], appendChild() {} };
  Object.defineProperty(body, 'isConnected', { get: () => true, configurable: true });
  Object.defineProperty(shell, 'isConnected', { get: () => true, configurable: true });

  const nodes = new Map([['app-shell', shell]]);

  function attach(parent, el) {
    if (el.parentNode && el.parentNode !== parent) {
      const kids = el.parentNode.childNodes;
      const i = kids.indexOf(el);
      if (i >= 0) kids.splice(i, 1);
    }
    el.parentNode = parent;
    if (!parent.childNodes.includes(el)) parent.childNodes.push(el);
    if (el.id) nodes.set(el.id, el);
    return el;
  }

  body.appendChild = function appendChild(el) {
    return attach(body, el);
  };
  shell.appendChild = function appendChild(el) {
    return attach(shell, el);
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
        childNodes: [],
        setAttribute() {},
      };
      Object.defineProperty(el, 'isConnected', {
        get() {
          return Boolean(this.parentNode?.isConnected);
        },
        configurable: true,
      });
      return el;
    },
  };

  return { body, shell, nodes, setShellConnected(v) {
    Object.defineProperty(shell, 'isConnected', { get: () => Boolean(v), configurable: true });
  } };
}

test('ensurePortalRoot attaches to document.body (not app-shell)', async () => {
  const { body, shell, nodes } = installDomStub();
  const mod = await import(`./safePortal.js?t=${Date.now()}-body`);
  const root = mod.ensurePortalRoot();
  assert.ok(root);
  assert.equal(root.id, mod.PORTAL_ROOT_ID);
  assert.equal(root.parentNode, body);
  assert.notEqual(root.parentNode, shell);
  assert.equal(nodes.get(mod.PORTAL_ROOT_ID), root);
  assert.equal(root.isConnected, true);
});

test('ensurePortalRoot never re-parents after first attach (removeChild race)', async () => {
  const { body, shell } = installDomStub();
  const mod = await import(`./safePortal.js?t=${Date.now()}-pin`);
  const root = mod.ensurePortalRoot();
  assert.equal(root.parentNode, body);

  // Even if shell is connected, do not move the host (old bug).
  const again = mod.ensurePortalRoot();
  assert.equal(again, root);
  assert.equal(again.parentNode, body);
  assert.equal(shell.childNodes.includes(root), false);
});

test('ensurePortalRoot returns null without document.body', async () => {
  installDomStub();
  globalThis.document.body = null;
  const mod = await import(`./safePortal.js?t=${Date.now()}-nobody`);
  assert.equal(mod.ensurePortalRoot(), null);
});

test('createAppPortal ignores preferred #app-shell host (always body root)', async () => {
  const { body, shell } = installDomStub();
  const mod = await import(`./safePortal.js?t=${Date.now()}-ignore-shell`);
  const root = mod.ensurePortalRoot();
  assert.equal(root.parentNode, body);
  // Preferred shell must not win — that was the removeChild crash vector.
  const resolved = mod.resolvePortalHost(shell);
  assert.equal(resolved, root);
  assert.notEqual(resolved, shell);
});

test('getStablePortalContainer returns body-mounted root', async () => {
  const { body } = installDomStub();
  const mod = await import(`./safePortal.js?t=${Date.now()}-stable`);
  const c = mod.getStablePortalContainer();
  assert.ok(c);
  assert.equal(c.parentNode, body);
  assert.equal(c.id, mod.PORTAL_ROOT_ID);
});

test('createAppPortal returns null when portal root cannot attach', async () => {
  installDomStub();
  globalThis.document.body = null;
  const mod = await import(`./safePortal.js?t=${Date.now()}-disc`);
  assert.equal(mod.createAppPortal('x', { isConnected: true }), null);
});
