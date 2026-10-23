// Game state and the workday loop. UI listens to NR.emit('update').
(function (NR) {
  'use strict';
  const DAY_MIN = 480; // 9:00 -> 17:00

  function fresh(mode = 'story', seed) {
    return {
      v: 2, mode, seed: seed || null,
      day: 1, minute: 0, clockedIn: false,
      grossToday: 0, gross: 0, cash: 60, heat: 0, strikes: 0,
      deck: NR.STARTER_DECK.slice(), upgrades: {},
      leads: [], pending: [], vault: [], callsToday: [], quotesToday: [],
      conscience: 0, victims: [], flags: {}, mail: [], news: [], evidence: 0,
      stats: { calls: 0, paid: 0, baitersCaught: 0, baitersFell: 0, biggest: 0, combos: 0, raidsSurvived: 0, casino: 0 },
      achievements: {},
    };
  }

  NR.G = null;
  NR.call = null;
  let ticker = null;

  NR.quota = (day) => {
    const q = NR.QUOTAS[Math.min(day, NR.QUOTAS.length) - 1];
    return day > NR.QUOTAS.length ? Math.round(q * Math.pow(1.18, day - NR.QUOTAS.length)) : q;
  };
  NR.unlockedScams = () => Object.keys(NR.SCAMS).filter((id) => NR.G.mode !== 'story' || NR.SCAMS[id].unlock <= NR.G.day);
  NR.clockStr = (m = NR.G.minute) => { const h = 9 + Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  NR.newGame = function (mode, seed) {
    if (seed) NR.seed(seed);
    NR.G = fresh(mode, seed);
    NR.story && NR.story.init(NR.G);
    save();
  };
  NR.loadGame = function () {
    const g = NR.store.get('save', null);
    if (!g || g.v !== 2) return false;
    NR.G = Object.assign(fresh(), g);
    return true;
  };
  function save() { if (NR.G && NR.G.mode !== 'mp') NR.store.set('save', NR.G); }
  NR.save = save;

  // ------------------------------------------------------------- leads
  NR.refillLeads = function () {
    const G = NR.G;
    while (G.leads.length < 5) {
      const story = NR.story && NR.story.nextLead(G);
      const v = story || NR.makeVictim({ wealthMult: G.upgrades.leads ? 1.35 : 1, baiterRate: Math.min(0.3, 0.08 + G.day * 0.012 + G.heat / 600) });
      G.leads.push(v);
    }
  };

  // ------------------------------------------------------------- day loop
  NR.startDay = function () {
    const G = NR.G;
    G.minute = 0; G.grossToday = 0; G.callsToday = []; G.quotesToday = []; G.clockedIn = true;
    G.leads = G.leads.filter((l) => !l.story);
    NR.refillLeads();
    save();
    startTicker();
    NR.emit('dayStart', G);
    NR.emit('update');
  };

  // Resume a shift after reloading a mid-day save.
  NR.resumeDay = function () {
    NR.refillLeads();
    startTicker();
    NR.emit('update');
  };

  function startTicker() {
    stopTicker();
    const ms = 750 * (NR.G.upgrades.coffee ? 1.25 : 1) / (NR.settings.speed || 1);
    ticker = setInterval(tick, ms);
  }
  function stopTicker() { if (ticker) clearInterval(ticker); ticker = null; }
  NR.pauseClock = (p) => { if (p) stopTicker(); else if (NR.G && NR.G.clockedIn) startTicker(); };

  function tick() {
    const G = NR.G;
    if (!G.clockedIn || NR.paused) return;
    if (G.minute >= DAY_MIN) {
      if (!NR.call) endDay();
      return;
    }
    G.minute++;
    if (G.minute % 60 === 0) NR.emit('hour', G.minute / 60);
    if (G.minute === DAY_MIN - 30) NR.emit('toast', { text: '⏰ 30 minutes until end of shift. Redeem your codes!', kind: 'warn' });
    maybeEvent();
    NR.emit('tick');
  }
  NR.advance = function (mins) { const G = NR.G; G.minute = Math.min(DAY_MIN, G.minute + mins); NR.emit('tick'); };

  function maybeEvent() {
    const G = NR.G;
    if (NR.eventActive) return;
    if (G.heat >= 100) { NR.emit('raid', { forced: true }); return; }
    if (G.heat >= 60 && NR.chance((G.heat - 55) / 9000)) NR.emit('raid', { forced: false });
  }

  function endDay() {
    const G = NR.G;
    G.clockedIn = false;
    stopTicker();
    // Unredeemed codes expire overnight.
    const expired = G.pending.filter((p) => !p.done).length;
    G.pending = [];
    const quota = NR.quota(G.day);
    const made = G.grossToday >= quota;
    const ratio = G.grossToday / quota;
    let grade = ratio >= 1.8 ? 'S' : ratio >= 1.35 ? 'A' : ratio >= 1 ? 'B' : ratio >= 0.7 ? 'C' : 'F';
    let bonus = 0;
    if (made) bonus = Math.round((G.grossToday - quota) * 0.1 + (grade === 'S' ? 150 : grade === 'A' ? 80 : 0));
    else G.strikes++;
    G.cash += bonus;
    const fired = G.strikes >= 2;
    G.heat = Math.max(0, G.heat - (G.upgrades.vpn ? 18 : 12));
    const review = { day: G.day, quota, gross: G.grossToday, grade, bonus, made, fired, expired, calls: G.callsToday.slice(), quotes: G.quotesToday.slice() };
    G.lastReview = review;
    NR.story && NR.story.endOfDay(G, review);
    if (!fired) { G.day++; }
    save();
    NR.emit('dayEnd', review);
    NR.emit('update');
  }
  NR.forceEndDay = () => { if (!NR.call) { NR.G.minute = DAY_MIN; endDay(); } };

  // ------------------------------------------------------------- calls
  NR.dial = function (leadId, scamId) {
    const G = NR.G;
    if (NR.call || !G.clockedIn) return null;
    const v = G.leads.find((l) => l.id === leadId);
    if (!v) return null;
    G.leads = G.leads.filter((l) => l !== v);
    G.stats.calls++;
    if (!v.story && NR.chance(0.14)) {
      NR.advance(4);
      NR.refillLeads();
      return { voicemail: NR.fill(NR.pick(NR.VOICEMAIL), { last: v.last, first: v.first, hobby: v.detail.kind === 'hobby' ? v.detail.key : 'bingo' }) };
    }
    const hand = 4 + (G.upgrades.hand ? 1 : 0);
    NR.call = new NR.Call(v, scamId, { upgrades: G.upgrades, deck: G.deck, handSize: hand });
    NR.call.start();
    NR.refillLeads();
    return { call: NR.call };
  };

  const HEAT = { tech: 5, gov: 7, refund: 5, prize: 4, bank: 6, grandkid: 6 };
  NR.on('callEnded', (c) => {
    const G = NR.G;
    if (!G) return;
    const heatMul = G.upgrades.vpn ? 0.65 : 1;
    const rec = { name: c.v.first + ' ' + c.v.last, age: c.v.age, scam: c.scam.name, outcome: c.outcome, amount: 0, baiter: c.v.baiter };
    if (c.outcome === 'paid') {
      G.pending.push(...c.payout.codes);
      G.heat += (HEAT[c.scamId] || 5) * heatMul;
      G.stats.paid++;
      rec.amount = c.payout.codes.reduce((a, b) => a + b.value, 0);
      if (!c.v.baiter) G.victims.push({ name: rec.name, age: c.v.age, city: c.v.city, amount: rec.amount, scam: c.scamId, traits: c.v.traits, day: G.day, story: c.v.story });
    }
    if (c.payout.ssn) G.vault.push({ ssn: c.payout.ssn, name: rec.name, age: c.v.age, price: NR.ri(60, 140), baiter: c.v.baiter });
    if (c.outcome === 'hangup') G.heat += 3 * heatMul;
    if (c.outcome === 'cashier') G.heat += 4 * heatMul;
    if (c.outcome === 'baiter') { G.heat += 10 * heatMul; G.stats.baitersFell++; NR.emit('toast', { text: '📹 A scambaiter recorded you. Heat +10', kind: 'bad' }); }
    if (c.outcome === 'reported') { G.cash += 40; G.stats.baitersCaught++; NR.emit('toast', { text: '🚩 Baiter caught! Boss sends +$40', kind: 'good' }); NR.achieve('baiterhunter', G.stats.baitersCaught >= 3); }
    G.callsToday.push(rec);
    const best = c.quotes.slice().sort((a, b) => b.score - a.score)[0];
    const worst = c.quotes.slice().sort((a, b) => a.score - b.score)[0];
    if (best) G.quotesToday.push({ ...best, who: rec.name, kind: 'best' });
    if (worst && worst !== best && worst.score < 0) G.quotesToday.push({ ...worst, who: rec.name, kind: 'worst' });
    NR.advance(2);
    setTimeout(() => { NR.call = null; NR.emit('update'); }, 0);
    save();
  });

  // Redeem a gift card / charge a card. Returns {ok, msg}.
  NR.redeem = function (input, type) {
    const G = NR.G;
    const norm = NR.normCode(input);
    if (!norm) return { ok: false, msg: 'Enter a code.' };
    const open = G.pending.concat(NR.call ? NR.call.payout.codes : []).filter((p) => !p.done && p.type === type);
    if (!open.length) return { ok: false, msg: 'No pending ' + (type === 'gift' ? 'gift cards' : 'cards') + '.' };
    const hit = open.find((p) => NR.normCode(p.code) === norm);
    if (type === 'card' && !NR.luhnValid(norm)) {
      const c = open[0]; c.tries++;
      if (c.tries >= 3) { c.done = true; c.lost = true; return { ok: false, msg: '⛔ Card flagged after 3 bad attempts. Lost.' }; }
      return { ok: false, msg: `Declined: invalid card number (checksum). Attempts left: ${3 - c.tries}` };
    }
    if (!hit) {
      // Charge the attempt to the closest open code.
      const best = open.map((p) => ({ p, d: diff(NR.normCode(p.code), norm) })).sort((a, b) => a.d - b.d)[0].p;
      best.tries++;
      NR.sfx('error');
      if (best.tries >= 3) { best.done = true; best.lost = true; return { ok: false, msg: `⛔ ${best.brand} card ${NR.money(best.value)} locked after 3 invalid tries.` }; }
      return { ok: false, msg: `Invalid code. Attempts left on that card: ${3 - best.tries}` };
    }
    hit.done = true;
    NR.emit('redeemed', hit);
    if (hit.baiter) {
      G.heat += 15; G.stats.baitersFell++;
      NR.emit('virus');
      NR.achieve('gotbaited', true);
      return { ok: false, msg: '💀 The card says: "Nice try, scammer ❤️". A file downloads itself… uh oh.' };
    }
    G.grossToday += hit.value; G.gross += hit.value;
    G.cash += hit.value * NR.CUT;
    G.stats.biggest = Math.max(G.stats.biggest, hit.value);
    NR.sfx('cash');
    NR.achieve('firstblood', true);
    NR.achieve('whale', hit.value >= 500);
    NR.emit('update');
    save();
    return { ok: true, msg: `✅ ${NR.money(hit.value)} credited. Your cut: ${NR.money(hit.value * NR.CUT)}` };
  };
  function diff(a, b) { let d = Math.abs(a.length - b.length); for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++; return d; }

  NR.sellIdentity = function (i) {
    const G = NR.G, it = G.vault[i];
    if (!it) return null;
    G.vault.splice(i, 1);
    if (it.baiter) { G.heat += 6; return { ok: false, msg: 'Buyer says the identity is fake. Your reputation (and heat) suffers.' }; }
    G.grossToday += it.price; G.gross += it.price; G.cash += it.price * NR.CUT;
    NR.sfx('cash'); save(); NR.emit('update');
    return { ok: true, msg: `Sold for ${NR.money(it.price)}.` };
  };

  // ------------------------------------------------------------- shop
  NR.buyUpgrade = function (id) {
    const G = NR.G, u = NR.UPGRADES.find((x) => x.id === id);
    if (!u || G.upgrades[id] || G.cash < u.cost) return false;
    G.cash -= u.cost; G.upgrades[id] = true;
    if (id === 'coffee' && G.clockedIn) startTicker();
    NR.sfx('coin'); save(); NR.emit('update');
    NR.achieve('collector', Object.keys(G.upgrades).length >= 5);
    return true;
  };
  NR.buyCard = function (id) {
    const G = NR.G, price = NR.CARD_PRICES[id];
    if (G.cash < price) return false;
    G.cash -= price; G.deck.push(id);
    NR.sfx('coin'); save(); NR.emit('update');
    return true;
  };
  NR.removeCard = function (idx) {
    const G = NR.G;
    if (G.cash < 50 || G.deck.length <= 8) return false;
    G.cash -= 50; G.deck.splice(idx, 1);
    save(); NR.emit('update');
    return true;
  };

  // ------------------------------------------------------------- events
  NR.raidResult = function (ok) {
    const G = NR.G;
    if (ok) { G.heat = 45; G.stats.raidsSurvived++; NR.achieve('slippery', true); }
    else {
      G.flags.busted = true;
      G.clockedIn = false; stopTicker();
      save();
      NR.emit('ending', 'busted');
    }
    NR.emit('update');
  };

  // ------------------------------------------------------------- achievements
  NR.ACHIEVEMENTS = {
    firstblood: ['First Blood', 'Redeem your first gift card.'],
    whale: ['Whale Watching', 'Redeem a $500 card.'],
    baiterhunter: ['Baiter Hunter', 'Catch 3 scambaiters.'],
    gotbaited: ['Got Baited', 'Redeem a scambaiter\'s fake card.'],
    combo: ['Combo Artist', 'Land a combo.'],
    slippery: ['Slippery', 'Survive a police raid.'],
    collector: ['Desk Hoarder', 'Own 5 desk upgrades.'],
    sgrade: ['Shark', 'Get an S grade.'],
    gambler: ['House Always Wins', 'Lose $200 at the casino.'],
    personal: ['Personal Touch', 'Mention a victim\'s personal detail in your own words.'],
    nomercy: ['No Mercy', 'Scam your own grandmother.'],
    redeemed: ['Redeemed', 'Get the Witness ending.'],
    kingpin: ['Kingpin', 'Get the Kingpin ending.'],
  };
  NR.achieve = function (id, cond) {
    const G = NR.G;
    if (!cond || !G || G.achievements[id]) return;
    G.achievements[id] = true;
    const all = NR.store.get('achievements', {}); all[id] = true; NR.store.set('achievements', all);
    NR.emit('toast', { text: `🏆 Achievement: ${NR.ACHIEVEMENTS[id][0]}`, kind: 'good' });
  };
})(window.NR);
