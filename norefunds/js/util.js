// Shared helpers. Everything hangs off the global NR namespace so the game
// runs from file:// without a build step or a module loader.
window.NR = window.NR || {};
(function (NR) {
  'use strict';

  // Seeded PRNG (mulberry32) so daily challenges are reproducible.
  let seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  NR.seed = function (s) { seed = (s >>> 0) || 1; };
  NR.rand = function () {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  NR.ri = (a, b) => a + Math.floor(NR.rand() * (b - a + 1));
  NR.pick = (arr) => arr[Math.floor(NR.rand() * arr.length)];
  NR.chance = (p) => NR.rand() < p;
  NR.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  NR.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(NR.rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  NR.money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  NR.uid = (() => { let i = 0; return (p = 'id') => p + (++i); })();

  // Replace {key} placeholders from an object; unknown keys are left as-is.
  NR.fill = function (text, ctx) {
    return text.replace(/\{(\w+)\}/g, (m, k) => (ctx && ctx[k] != null ? ctx[k] : m));
  };

  NR.hashStr = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  // Tiny DOM builder: el('div.cls#id', {attrs}, children...)
  NR.el = function (spec, attrs, ...kids) {
    const m = spec.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const node = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') node.classList.add(v); else node.id = v; });
    }
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return node;
  };
  NR.$ = (sel, root = document) => root.querySelector(sel);

  // Minimal event bus for decoupling game logic from UI.
  const handlers = {};
  NR.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
  NR.emit = (ev, data) => { (handlers[ev] || []).slice().forEach((fn) => fn(data)); };

  NR.store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('norefunds.' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem('norefunds.' + key, JSON.stringify(val)); } catch (e) { /* private mode */ } },
    del(key) { try { localStorage.removeItem('norefunds.' + key); } catch (e) { /* ignore */ } },
  };
})(window.NR);
