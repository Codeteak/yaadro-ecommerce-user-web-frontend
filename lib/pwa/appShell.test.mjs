import test from 'node:test';
import assert from 'node:assert/strict';

function installDomStub() {
  const htmlClassList = {
    _set: new Set(),
    add(c) {
      this._set.add(c);
    },
    remove(c) {
      this._set.delete(c);
    },
    contains(c) {
      return this._set.has(c);
    },
    toggle(c, force) {
      if (force === true) this._set.add(c);
      else if (force === false) this._set.delete(c);
      else if (this._set.has(c)) this._set.delete(c);
      else this._set.add(c);
      return this._set.has(c);
    },
  };

  const scroller = { style: { overflow: '' }, scrollTop: 0 };
  const body = { style: { overflow: '' } };
  const documentElement = {
    style: { overflow: '' },
    classList: htmlClassList,
    scrollTop: 0,
  };

  globalThis.window = {
    scrollY: 0,
    scrollTo(_x, y) {
      this.scrollY = y;
    },
    getComputedStyle(el) {
      if (el === scroller) return { overflowY: 'auto' };
      return { overflowY: 'visible' };
    },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document = {
    body,
    documentElement,
    getElementById(id) {
      if (id === 'app-scroll') return scroller;
      if (id === 'app-shell') return { classList: htmlClassList };
      return null;
    },
  };

  return { scroller, body, documentElement };
}

test('lockAppScroll is ref-counted and restores body overflow', async () => {
  const { body, documentElement } = installDomStub();
  const mod = await import(`./appShell.js?t=${Date.now()}-a`);
  mod.__resetAppScrollLockForTests();

  mod.lockAppScroll();
  assert.equal(mod.getAppScrollLockCount(), 1);
  assert.equal(body.style.overflow, 'hidden');
  assert.equal(documentElement.classList.contains('app-scroll-locked'), true);

  mod.lockAppScroll();
  assert.equal(mod.getAppScrollLockCount(), 2);

  mod.unlockAppScroll();
  assert.equal(mod.getAppScrollLockCount(), 1);
  assert.equal(body.style.overflow, 'hidden');

  mod.unlockAppScroll();
  assert.equal(mod.getAppScrollLockCount(), 0);
  assert.equal(body.style.overflow, '');
  assert.equal(documentElement.classList.contains('app-scroll-locked'), false);
});

test('unlockAppScroll clears leftover inline overflow on #app-scroll', async () => {
  const { scroller, documentElement } = installDomStub();
  const mod = await import(`./appShell.js?t=${Date.now()}-b`);
  mod.__resetAppScrollLockForTests();
  scroller.style.overflow = 'hidden';
  documentElement.style.overflow = 'hidden';

  mod.lockAppScroll();
  mod.unlockAppScroll();

  assert.equal(scroller.style.overflow, '');
  assert.equal(documentElement.style.overflow, '');
});
