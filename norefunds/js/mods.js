// JSON mods: merge extra content into the game data at boot.
// Arrays are appended, objects are merged key by key. Stored in this browser.
(function (NR) {
  'use strict';
  const TARGETS = ['TACTICS', 'TRAITS', 'SCAMS', 'PLAYER_LINES', 'VICTIM_LINES', 'BAITER_TELLS', 'BAITER_NAMES', 'SUSPICIOUS_LINES', 'HANGUP_LINES',
    'GREETINGS', 'TIPS', 'CITIES', 'GIFT_BRANDS', 'NAMES', 'DETAILS', 'COMBOS', 'CARD_PRICES', 'CARD_SHOP', 'BOSS_LINES'];

  function merge(dst, src) {
    if (Array.isArray(dst) && Array.isArray(src)) { dst.push(...src); return dst; }
    if (dst && typeof dst === 'object' && src && typeof src === 'object') {
      for (const [k, v] of Object.entries(src)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        if (dst[k] && typeof dst[k] === 'object' && typeof v === 'object') merge(dst[k], v); else dst[k] = v;
      }
      return dst;
    }
    return src;
  }

  NR.validateMod = function (mod) {
    if (!mod || typeof mod !== 'object') throw new Error('Mod must be a JSON object.');
    const keys = Object.keys(mod).filter((k) => k !== 'name' && k !== 'author' && k !== 'description');
    const bad = keys.filter((k) => !TARGETS.includes(k));
    if (bad.length) throw new Error('Unknown sections: ' + bad.join(', '));
    for (const [id, s] of Object.entries(mod.SCAMS || {})) {
      if (!Array.isArray(s.stages) || !s.stages.length) throw new Error(`Scam "${id}" needs stages.`);
      if (!s.stages.some((st) => st.pay)) throw new Error(`Scam "${id}" needs a stage with "pay": true.`);
      s.mods = s.mods || {}; s.unlock = s.unlock || 1; s.pay = s.pay || 'gift';
    }
    for (const [id, t] of Object.entries(mod.TRAITS || {})) { t.mods = t.mods || {}; t.label = t.label || id; t.hint = t.hint || t.label; t.reveal = t.reveal || t.label; }
    return keys;
  };

  NR.applyMod = function (mod) { NR.validateMod(mod); for (const k of Object.keys(mod)) if (TARGETS.includes(k)) merge(NR[k], mod[k]); };

  NR.mods = NR.store.get('mods', []);
  for (const m of NR.mods) {
    if (m.enabled === false) continue;
    try { NR.applyMod(m.data); } catch (e) { console.warn('Mod failed:', m.data && m.data.name, e.message); }
  }
})(window.NR);
