// Party mode: Scammers vs Baiters. One screen runs the call center (share it
// on Discord or a TV); the victim opens the same game on their phone, types a
// code and gets a secret character sheet. No server: both devices derive the
// same character from the code.
//
// Everyone plays every round: the caller works the call, the victim acts it
// out and spends reaction tokens, spectators place predictions and each gets
// one chaos card to throw into the call.
(function (NR) {
  'use strict';
  const el = NR.el;
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PAY_SECS = 90;

  NR.PARTY_OBJECTIVES = [
    'Make the caller say the word "pineapple".',
    'Get the caller to tell you their "real" first name.',
    'Make them repeat their badge or ID number three times.',
    'Talk about your personal detail for 30 seconds without being cut off.',
    'Pretend the line is breaking up at least twice.',
    'Put the caller on hold to "find your glasses" — twice.',
    'Get the caller to hum or sing the hold music.',
    'Convince the caller that you once worked at the same company.',
    'Ask the caller for help with an unrelated problem (your TV remote, your crossword…).',
    'Get the caller to give you a "case number" and then read it back wrong.',
    'Make the caller laugh out loud.',
    'Spell your own name wrong and make them correct you.',
    'Get the caller to agree to call you back "next Tuesday".',
    'Make the caller explain what a "gift card" is.',
  ];

  // Victim reaction tokens: the victim says the line out loud, the host taps it.
  NR.PARTY_TOKENS = {
    objection: { icon: '🛑', name: 'Objection!', say: '"Hold on, that doesn\'t make sense!"', desc: 'Kills their momentum: trust −8, suspicion +8.', eff: { trust: -8, susp: 8 } },
    prove: { icon: '✋', name: 'Prove it!', say: '"Prove it. Give me something official."', desc: 'Their next card must be Fake Proof, or suspicion +15.', eff: { demand: { name: 'Prove it', tactics: ['proof'], susp: 15 } } },
    what: { icon: '👂', name: 'What? Say again', say: '"Sorry, what? Say that again… slowly."', desc: 'They must repeat their last line. You stay on longer (+2 patience).', eff: { patience: 2 } },
    doorbell: { icon: '🔔', name: 'Someone\'s at the door', say: '"Hold on, someone\'s at the door…"', desc: 'Wipes their pressure and their next card is weaker (×0.6).', eff: { press: -40, nextMult: 0.6 } },
    cry: { icon: '😭', name: 'Start crying', say: '(sob loudly)', desc: 'Their next card must be Sympathize or Calm Down, or suspicion +12.', eff: { demand: { name: 'Comfort me', tactics: ['empathy', 'reassure'], susp: 12 } } },
    family: { icon: '👨‍👩‍👧', name: 'My son is here', say: '"My son just got home. He wants a word."', desc: 'Suspicion +12; their next card must be Pull Rank, or +10 more.', eff: { susp: 12, demand: { name: 'Talk to my son', tactics: ['authority'], susp: 10 } } },
    greedy: { icon: '🤑', name: 'What\'s in it for me?', say: '"And what do I get out of this?"', desc: 'Their next card must be Dangle Prize or Butter Up, or suspicion +10.', eff: { demand: { name: 'What\'s in it for me', tactics: ['prize', 'flattery'], susp: 10 } } },
    confused: { icon: '🤷', name: 'Total confusion', say: '"I don\'t understand ANY of this."', desc: 'Their next card is half as effective.', eff: { nextMult: 0.5 } },
  };

  // Chaos cards: each spectator gets one per round and picks the moment.
  NR.PARTY_CHAOS = [
    { icon: '🐕', name: 'Barking dog', line: '🐕 A dog starts barking on the victim\'s end. Caller: talk louder! (patience −1)', eff: { patience: -1 } },
    { icon: '👔', name: 'Boss walks by', line: '👔 Vance is standing right behind the caller. Their next card is half as effective.', eff: { nextMult: 0.5 } },
    { icon: '🚨', name: 'Sirens outside', line: '🚨 Sirens outside the victim\'s window. Suspicion +10.', eff: { susp: 10 } },
    { icon: '📶', name: 'Bad signal', line: '📶 The line crackles. Caller: repeat your last line out loud. (patience −1)', eff: { patience: -1 } },
    { icon: '☕', name: 'Coffee spill', line: '☕ Coffee all over the script! The caller\'s hand is reshuffled.', eff: { redraw: true } },
    { icon: '🍀', name: 'Lucky break', line: '🍀 The victim just saw a scary news story about hackers. Trust +8.', eff: { trust: 8 } },
    { icon: '🦜', name: 'Parrot', line: '🦜 A parrot repeats the caller\'s last word. Loudly. Suspicion +5.', eff: { susp: 5 } },
    { icon: '📺', name: 'TV warning', line: '📺 The victim\'s TV is running a segment on phone scams! Suspicion +12.', eff: { susp: 12 } },
    { icon: '⚡', name: 'Power flicker', line: '⚡ The lights flicker and the victim gets jumpy. Pressure +15.', eff: { press: 15 } },
  ];

  const CUE_LEGEND = [['😍', 'WON OVER', 'warm, trusting, eager to help'], ['🙂', 'GOING ALONG', 'cooperative, a little unsure'], ['😒', 'PUT OFF', 'annoyed, cold'],
    ['🤨', 'VERY SUSPICIOUS', 'openly doubting them'], ['😤', 'LOSING PATIENCE', 'about to hang up'], ['✅', 'AGREES', 'say yes to what they asked'],
    ['❌', 'REFUSES', 'say no, push back'], ['💳', 'AGREES TO PAY', 'read your cards out loud']];

  const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

  // Everything secret about a victim, derived only from the code.
  NR.partyData = function (code) {
    const norm = normCode(code);
    NR.seed(NR.hashStr('nr-party:' + norm));
    const baiter = NR.chance(0.35);
    const v = NR.makeVictim({ baiter: false, baiterRate: 0 });
    const amount = Math.max(100, Math.round((v.savings * 0.3) / 50) * 50);
    const denoms = [500, 250, 200, 100];
    const values = [];
    let left = amount;
    while (left >= 100 && values.length < 4) { const d = denoms.find((x) => x <= left); values.push(d); left -= d; }
    const brand = NR.pick(NR.GIFT_BRANDS);
    const cards = values.map((value) => ({ type: 'gift', brand, value, code: NR.giftCode(), spoken: '🔒 ask the victim', baiter, party: true, from: `${v.first} ${v.last}`, tries: 0, done: false }));
    const objective = NR.pick(NR.PARTY_OBJECTIVES);
    const tokens = NR.shuffle(Object.keys(NR.PARTY_TOKENS)).slice(0, 3);
    NR.seed((Date.now() ^ 0x5bd1e995) >>> 0);
    return { code: norm, v, baiter, cards, amount: values.reduce((a, b) => a + b, 0), objective, brand, tokens };
  };

  function traitGuide(tr) {
    const t = NR.TRAITS[tr];
    const strong = [], weak = [];
    for (const [id, m] of Object.entries(t.mods)) {
      if (!NR.TACTICS[id] || NR.TACTICS[id].special) continue;
      if (m >= 1.4) strong.push(NR.TACTICS[id].name); else if (m <= 0.6) weak.push(NR.TACTICS[id].name);
    }
    return { label: t.label, reveal: t.reveal, strong, weak };
  }

  // ------------------------------------------------------------ host side
  let P = null;
  NR.party = () => P;
  const saveParty = () => { if (P) NR.store.set('party', { ...P, cur: null }); };
  NR.hasSavedParty = () => !!NR.store.get('party', null);

  function enterDesktop() {
    NR.newGame('party');
    NR.G.clockedIn = true;
    NR.G.cash = 0;
    NR.$('#boot').hidden = true;
    NR.$('#desktop').hidden = false;
    NR.closeAll();
    NR.renderIcons();
    NR.emit('update');
    NR.openApp('phone');
    startTicker();
  }

  NR.startParty = function () {
    const ta = el('textarea#party-names', { rows: 6, style: { width: '100%' }, placeholder: 'One name per line (2–8 players)' });
    ta.value = NR.store.get('partyNames', ['Ana', 'Bruno', 'Carla', 'Dani']).join('\n');
    const laps = el('select#party-laps', ...[1, 2, 3].map((n) => el('option', { value: n }, `${n} lap${n > 1 ? 's' : ''} (everyone calls ${n}×)`)));
    const mins = el('select#party-mins', ...[[180, '3 min (fast)'], [300, '5 min'], [480, '8 min (long cons)']].map(([s, l]) => el('option', { value: s, selected: s === 300 }, l)));
    NR.modal('🎉 Scammers vs Baiters', el('div',
      el('p', 'Everyone joins a voice call (Discord works great) and this screen is shared. Each round one player is the ', el('b', 'caller'), ' and another plays a secret ', el('b', 'victim'), ' from their phone.'),
      el('ul', { style: { margin: '6px 0', paddingLeft: '18px' } },
        el('li', 'Some victims are secretly ', el('b', 'scambaiters'), ' holding fake gift cards.'),
        el('li', 'Victims have ', el('b', 'reaction tokens'), ' to fight back, and a secret objective.'),
        el('li', 'Everyone else ', el('b', 'predicts'), ' the outcome and gets a ', el('b', 'chaos card'), ' to throw into the call.')),
      el('label', { for: 'party-names' }, 'Players'), ta,
      el('div.row', { style: { marginTop: '8px', flexWrap: 'wrap' } }, el('label', { for: 'party-laps' }, 'Length'), laps, el('label', { for: 'party-mins' }, 'Round timer'), mins)),
    [{ label: 'Cancel' }, { label: 'Start party', cls: 'primary', fn: () => {
      const players = [...new Set(ta.value.split('\n').map((s) => s.trim()).filter(Boolean))].slice(0, 8);
      if (players.length < 2) { NR.toast('Add at least 2 players.', 'warn'); return; }
      NR.store.set('partyNames', players);
      P = {
        players, round: 0, lap: 1, laps: +laps.value, roundSecs: +mins.value,
        scores: Object.fromEntries(players.map((p) => [p, 0])),
        stats: Object.fromEntries(players.map((p) => [p, { redeemed: 0, victimPts: 0, baitPts: 0, predPts: 0, chaos: 0, gullible: 0 }])),
        cur: null, history: [],
      };
      enterDesktop();
      nextRound();
    } }]);
  };

  NR.resumeParty = function () {
    const saved = NR.store.get('party', null);
    if (!saved) return;
    P = saved;
    enterDesktop();
    nextRound();
  };

  const totalRounds = () => P.players.length * P.laps;

  function nextRound() {
    const n = P.players.length;
    const scammer = P.players[P.round % n];
    const lapOff = Math.floor(P.round / n) % (n - 1) + 1; // a different victim each lap
    const victim = P.players[(P.round + lapOff) % n];
    const spectators = P.players.filter((p) => p !== scammer && p !== victim);
    P.cur = {
      scammer, victim, spectators, code: newCode(), real: 0, bait: 0, frozen: 0, call: null,
      preds: Object.fromEntries(spectators.map((s) => [s, {}])),
      chaos: Object.fromEntries(spectators.map((s) => [s, { ...NR.pick(NR.PARTY_CHAOS), used: false }])),
      tokensUsed: {},
    };
    saveParty();
    NR.G.pending = [];
    NR.closeApp('redeem');
    NR.closeApp('remote');
    NR.openApp('phone');
    NR.modal(`Round ${P.round + 1} of ${totalRounds()}`, el('div', { style: { textAlign: 'center' } },
      el('p', { style: { fontSize: '18px' } }, '📞 ', el('b', scammer), ' is the caller.  🎭 ', el('b', victim), ' is the victim.'),
      el('p', el('b', victim), ': open this game on your phone, tap ', el('b', '📱 I\'m the victim'), ' and enter:'),
      el('div.party-code', P.cur.code),
      el('p.muted', 'Keep your phone screen private. ' + scammer + ', no peeking!'),
      spectators.length ? el('p.muted', `${spectators.join(', ')}: make your predictions on the next screen.`) : null),
    [{ label: 'Victim is ready', cls: 'primary', fn: () => NR.refreshApp('phone') }]);
  }

  function dialVictim(scamId) {
    const data = NR.partyData(P.cur.code);
    const c = new NR.Call(data.v, scamId, { upgrades: {}, deck: NR.STARTER_DECK, handSize: 4 });
    c.party = { baiter: data.baiter, cards: data.cards };
    c.amount = data.amount;
    c.ctx.amount = NR.money(data.amount);
    c.ctx.gift = data.brand;
    c.cue = ['PICKS UP — say hello!', '📞', 'ok'];
    P.cur.call = c; P.cur.data = data;
    P.cur.deadline = Date.now() + P.roundSecs * 1000;
    NR.call = c;
    c.say('sys', `📞 ${P.cur.victim} picks up as ${data.v.first} ${data.v.last}. Caller: say your line out loud, then play the card that matches it. Victim: act out the banner.`);
    NR.sfx('pickup');
    NR.refreshApp('phone');
    NR.emit('update');
  }

  NR.on('redeemed', (hit) => {
    if (!P || !P.cur || !hit.party) return;
    if (hit.baiter) P.cur.bait++; else P.cur.real += hit.value;
  });

  // ------------------------------------------------------------ timers
  let ticker = null;
  function startTicker() { if (!ticker) ticker = setInterval(tick, 500); }
  function tick() {
    if (!P || !P.cur || !P.cur.call) return;
    const c = P.cur.call, now = Date.now();
    if (['talk', 'cashier', 'store'].includes(c.state) && now >= P.cur.deadline) {
      c.effect({ line: '⏰ Time\'s up! The victim has had enough and hangs up.', cue: ['HANGS UP', '📵', 'bad'] });
      c.patience = 0; c.checkEnd();
      NR.sfx('hangup');
      NR.refreshApp('phone');
    }
    if (c.party.cards.length && (c.state === 'reading' || c.outcome === 'paid') && !P.cur.payDeadline) P.cur.payDeadline = now + PAY_SECS * 1000;
    if (P.cur.payDeadline && !P.cur.payFrozen && now >= P.cur.payDeadline) {
      P.cur.payFrozen = true;
      for (const card of c.party.cards) if (!card.done) { card.done = true; card.lost = true; P.cur.frozen++; }
      if (P.cur.frozen) { NR.toast(`🧊 The bank froze ${P.cur.frozen} card(s)!`, 'bad'); NR.sfx('error'); }
      if (c.state === 'reading') c.finishPayment();
      NR.refreshApp('phone'); NR.refreshApp('redeem');
    }
    const t = NR.$('#party-timer');
    if (t) { const [text, cls] = timerText(c); t.textContent = text; t.className = cls; }
  }
  function timerText(c) {
    const now = Date.now();
    if (P.cur.payDeadline && !P.cur.payFrozen) return [`🧊 Cards freeze in ${fmtSecs(Math.ceil((P.cur.payDeadline - now) / 1000))}`, 'ptimer pay'];
    if (['talk', 'cashier', 'store'].includes(c.state)) {
      const s = Math.ceil((P.cur.deadline - now) / 1000);
      return [`⏱ ${fmtSecs(s)}`, 'ptimer' + (s <= 30 ? ' low' : '')];
    }
    return ['', 'ptimer'];
  }

  // ------------------------------------------------------------ in-call bar
  NR.partyCallBar = function (c) {
    if (!P || !P.cur || P.cur.call !== c) return null;
    const live = c.state !== 'done';
    const [text, icon, cls] = c.cue || ['ON THE LINE', '📞', 'ok'];
    const use = (fn) => () => { fn(); NR.sfx('popup'); NR.refreshApp('phone'); NR.emit('update'); };
    const tokens = P.cur.data.tokens.map((id) => {
      const t = NR.PARTY_TOKENS[id];
      return el('button.ptoken', { disabled: !live || P.cur.tokensUsed[id], title: t.desc,
        onclick: use(() => { P.cur.tokensUsed[id] = true; c.effect({ ...t.eff, line: `${t.icon} ${P.cur.victim} plays ${t.name} ${t.say} — ${t.desc}` }); }) },
      `${t.icon} ${t.name}`);
    });
    const chaos = Object.entries(P.cur.chaos).map(([who, ch]) => el('button.pchaos', { disabled: !live || ch.used, title: ch.line,
      onclick: use(() => { ch.used = true; P.stats[who].chaos++; c.effect({ ...ch.eff, line: `${ch.line} (thrown by ${who})` }); }) }, `${ch.icon} ${who}: ${ch.name}`));
    return el('div.partybar',
      el('div', { class: 'cue ' + cls }, el('span.ci', icon), el('span', el('small', `🎭 ${P.cur.victim}, act: `), text)),
      c.demand && live ? el('span.pwarn', `⚠ Demand: ${c.demand.name} — play ${c.demand.tactics.map((t) => NR.TACTICS[t].name).join(' or ')} next (+${c.demand.susp} suspicion otherwise)`) : null,
      c.nextMult && live ? el('span.pwarn', `⚠ Next card ×${c.nextMult}`) : null,
      (() => { const [text, cls] = timerText(c); return el('span#party-timer', { class: cls }, text); })(),
      el('div.prow', el('b', `🎭 ${P.cur.victim}'s tokens:`), ...tokens),
      chaos.length ? el('div.prow', el('b', '🌪️ Chaos:'), ...chaos) : null);
  };

  // ------------------------------------------------------------ scoring
  function roundPoints(objectiveDone) {
    const c = P.cur.call, base = P.cur.data, turns = c ? c.turns : 0;
    const out = { lines: [], delta: {} };
    const add = (who, pts, why, stat) => {
      if (!pts) return;
      out.delta[who] = (out.delta[who] || 0) + pts;
      out.lines.push(`${who} ${pts >= 0 ? '+' : ''}${pts} — ${why}`);
      if (stat) P.stats[who][stat] += pts;
    };
    const caller = P.cur.scammer, victim = P.cur.victim;
    if (P.cur.real) { add(caller, Math.round(P.cur.real / 10), `redeemed ${NR.money(P.cur.real)}`); P.stats[caller].redeemed += P.cur.real; }
    if (P.cur.bait) { add(caller, -50 * P.cur.bait, `redeemed ${P.cur.bait} fake card(s)`); P.stats[caller].gullible += P.cur.bait; add(victim, 60 * P.cur.bait, 'baited the caller', 'baitPts'); }
    if (c && c.outcome === 'reported') { add(caller, 50, 'unmasked the scambaiter'); add(victim, -30, 'got caught baiting', 'victimPts'); }
    if (c && c.outcome === 'falsereport') { add(caller, -30, 'accused an innocent victim'); add(victim, 20, 'falsely accused', 'victimPts'); }
    if (c && ['hangup', 'bored'].includes(c.outcome)) add(victim, 40, 'didn\'t fall for it', 'victimPts');
    if (turns) add(victim, turns * 3, `wasted ${turns} turns`, 'victimPts');
    if (P.cur.frozen && !base.baiter) add(victim, 20 * P.cur.frozen, `stalled until ${P.cur.frozen} card(s) froze`, 'victimPts');
    if (objectiveDone) add(victim, 40, 'secret objective: ' + base.objective, 'victimPts');
    const paid = !!(c && c.outcome === 'paid' && P.cur.real > 0);
    for (const [who, pr] of Object.entries(P.cur.preds)) {
      if (pr.role && (pr.role === 'baiter') === base.baiter) add(who, 15, 'called the victim\'s role', 'predPts');
      if (pr.pays != null && pr.pays === paid) add(who, 10, `predicted the money ${paid ? 'would' : 'wouldn\'t'} flow`, 'predPts');
    }
    for (const [who, pts] of Object.entries(out.delta)) P.scores[who] += pts;
    return out;
  }

  function endRound() {
    const data = P.cur.data;
    const c = P.cur.call;
    if (c && c.state !== 'done') c.hangUp();
    // Unredeemed cards are lost once the round ends.
    for (const card of data.cards) if (!card.done) { card.done = true; card.lost = true; }
    const v = data.v;
    const finish = (done) => {
      const s = roundPoints(done);
      P.history.push({ ...s, scammer: P.cur.scammer, victim: P.cur.victim, outcome: c && c.outcome });
      NR.call = null;
      P.cur.over = true;
      NR.refreshApp('phone');
      const last = P.round + 1 >= totalRounds();
      NR.modal('Round results', el('div', el('ul', ...(s.lines.length ? s.lines : ['No points this round.']).map((t) => el('li', t))), scoreboard()),
        [{ label: last ? 'Final results' : 'Next round', cls: 'primary', fn: () => {
          P.round++;
          if (P.round >= totalRounds()) finalResults(); else nextRound();
        } }]);
    };
    NR.modal('The reveal', el('div',
      el('p', el('b', P.cur.victim), ' was playing ', el('b', `${v.first} ${v.last}, ${v.age}`), ' — ',
        data.baiter ? el('b', { style: { color: 'var(--bad)' } }, '😈 a SECRET SCAMBAITER') : el('b', { style: { color: 'var(--good)' } }, '🎭 a real victim'), '.'),
      el('p', 'Traits: ', v.traits.map((t) => NR.TRAITS[t].label).join(', ')),
      el('p', 'Secret objective: ', el('i', data.objective)),
      el('p', el('b', 'Did they pull it off?'), ' Everyone votes.')),
    [{ label: '👎 No', fn: () => finish(false) }, { label: '👍 Yes!', cls: 'primary', fn: () => finish(true) }]);
  }

  function scoreboard() {
    const rows = Object.entries(P.scores).sort((a, b) => b[1] - a[1]);
    return el('table.list', el('tr', el('th', 'Player'), el('th', 'Points')), ...rows.map(([p, s], i) => el('tr', el('td', (i === 0 && s > 0 ? '👑 ' : '') + p), el('td', el('b', s)))));
  }

  function awards() {
    const best = (stat, min = 1) => {
      const [who, val] = Object.entries(P.stats).sort((a, b) => b[1][stat] - a[1][stat])[0];
      return val[stat] >= min ? who : null;
    };
    const list = [
      ['💰', 'Top Closer', best('redeemed'), (w) => `${NR.money(P.stats[w].redeemed)} redeemed`],
      ['🎭', 'Best Victim', best('victimPts'), (w) => `${P.stats[w].victimPts} pts as a victim`],
      ['😈', 'Bait Master', best('baitPts'), (w) => `${P.stats[w].baitPts} pts from fake cards`],
      ['🔮', 'The Oracle', best('predPts'), (w) => `${P.stats[w].predPts} pts from predictions`],
      ['🌪️', 'Agent of Chaos', best('chaos'), (w) => `${P.stats[w].chaos} chaos cards thrown`],
      ['🤡', 'Most Gullible Scammer', best('gullible'), (w) => `redeemed ${P.stats[w].gullible} fake card(s)`],
    ].filter((a) => a[2]);
    return el('div.awards', ...list.map(([icon, title, who, why]) => el('div.award', el('span.ai', icon), el('div', el('b', title), el('div', who), el('small.muted', why(who))))));
  }

  function finalResults() {
    NR.store.del('party');
    const [winner] = Object.entries(P.scores).sort((a, b) => b[1] - a[1])[0];
    NR.sfx('cash');
    NR.modal('🏆 Final results', el('div', { style: { textAlign: 'center' } }, el('div.big', `${winner} wins!`), awards(), scoreboard()),
      [{ label: 'Title screen', fn: () => location.reload() }, { label: 'Play another lap', cls: 'primary', fn: () => { P.laps++; nextRound(); } }]);
  }

  // ------------------------------------------------------------ phone app panel
  NR.partyPanel = function (body) {
    if (!P || !P.cur) { body.replaceChildren(el('p.muted', 'Party not started.')); return; }
    const c = P.cur.call;
    const head = el('h3', `🎉 Round ${P.round + 1}/${totalRounds()}: 📞 ${P.cur.scammer} vs 🎭 ${P.cur.victim}`);
    let main;
    if (c) {
      const pend = c.party.cards.filter((p) => !p.done).length;
      main = el('div',
        NR.partyCallBar(c),
        el('p', `Call over (${c.outcome}). `, pend ? `${pend} card(s) left — ${P.cur.victim}, read them out; ${P.cur.scammer}, type them into 🎁 Redeem before they freeze.` : ''),
        el('div.row', pend ? el('button', { onclick: () => NR.openApp('redeem') }, '🎁 Open Redeem') : null, el('button.primary', { onclick: endRound }, '🏁 End round & reveal')));
    } else {
      const scams = Object.keys(NR.SCAMS).filter((s) => !NR.SCAMS[s].elderlyOnly);
      const sel = el('select#party-scam', ...scams.map((s) => el('option', { value: s }, `${NR.SCAMS[s].name} — ${NR.SCAMS[s].blurb}`)));
      const predRows = P.cur.spectators.map((who) => {
        const pr = P.cur.preds[who];
        const pick = (k, val) => () => { pr[k] = val; NR.refreshApp('phone'); };
        const b = (k, val, label) => el('button', { class: pr[k] === val ? 'on' : '', onclick: pick(k, val) }, label);
        return el('tr', el('td', el('b', who)), el('td', b('role', 'real', '🎭 Real'), b('role', 'baiter', '😈 Baiter')), el('td', b('pays', true, '💰 Pays'), b('pays', false, '🛡 Holds out')));
      });
      main = el('div',
        predRows.length ? el('div', el('h3', '🔮 Predictions'), el('p.muted', 'Spectators: is the victim real or a baiter? Will the money flow? (+15 / +10)'),
          el('table.list.preds', ...predRows)) : null,
        el('h3', { style: { marginTop: '10px' } }, `📞 ${P.cur.scammer}, pick your script`),
        el('p.muted', 'You know nothing about this victim. Chit-Chat to find their weak spots — and watch out for baiters.'),
        el('div.row', sel, el('button.primary', { onclick: () => dialVictim(sel.value) }, `📞 Call ${P.cur.victim}`)));
    }
    body.replaceChildren(head, main,
      el('h3', { style: { marginTop: '12px' } }, 'Scoreboard'), scoreboard(),
      el('details', { style: { marginTop: '10px' } }, el('summary', 'How scoring works'), el('ul',
        el('li', 'Caller: +1 per $10 redeemed · +50 for unmasking a baiter · −30 for a false accusation · −50 per fake card redeemed.'),
        el('li', 'Victim: +3 per turn · +40 if the caller fails · +40 secret objective · +60 per fake card redeemed · +20 per real card that freezes · −30 if unmasked.'),
        el('li', `Spectators: +15 for calling real/baiter, +10 for calling the money. Cards freeze ${PAY_SECS}s after the victim agrees to pay.`))));
  };

  // ------------------------------------------------------------ victim side
  NR.victimScreen = function (prefill) {
    const boot = NR.$('#boot');
    boot.hidden = false;
    boot.style.justifyContent = '';
    const input = el('input#victim-code', { type: 'text', maxlength: 8, autocomplete: 'off', placeholder: 'CODE', value: prefill || '',
      style: { font: '900 32px var(--mono)', letterSpacing: '6px', width: '220px', textAlign: 'center', textTransform: 'uppercase' } });
    const go = () => { const code = normCode(input.value); if (code.length >= 4) sheet(code); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    boot.replaceChildren(el('div.logo', { style: { fontSize: '48px' } }, 'NO REFUNDS'), el('div.stamp', 'VICTIM PHONE'),
      el('p.sub', 'Enter the code shown on the call-center screen.'), input,
      el('div.menu', { style: { marginTop: '12px' } }, el('button.primary', { onclick: go }, 'Get my character'), el('button', { onclick: () => NR.title() }, 'Back')));
    setTimeout(() => input.focus(), 0);
  };

  function sheet(code) {
    const d = NR.partyData(code);
    const v = d.v;
    const boot = NR.$('#boot');
    boot.style.justifyContent = 'flex-start';
    const guides = v.traits.map(traitGuide);
    const card = el('div.victim-sheet',
      el('div', { class: 'role ' + (d.baiter ? 'baiter' : 'real') }, d.baiter ? '😈 SECRET SCAMBAITER' : '🎭 REAL VICTIM'),
      el('h2', `${v.first} ${v.last}, ${v.age}`), el('div.muted', v.city),
      el('p', d.baiter
        ? 'You only PRETEND to be gullible. Waste their time, act a little too eager, and get them to redeem your fake cards. If they press 🚩 Baiter!, you lose points.'
        : 'You are a real, trusting person. Follow the banner on the shared screen — it tells you how each line landed.'),
      el('h3', 'Your personality'),
      ...guides.map((g) => el('div.trait', el('b', g.label), ` — your character ${g.reveal}.`,
        g.strong.length ? el('div', '👍 Falls for: ' + g.strong.join(', ')) : null,
        g.weak.length ? el('div', '👎 Hates: ' + g.weak.join(', ')) : null)),
      el('p', '📌 Bring this up when they ask about your life: ', el('b', v.detail.text)),
      el('h3', '🎯 Secret objective'), el('p.objective', d.objective),
      el('h3', '🃏 Your reaction tokens (once each)'),
      el('p.muted', 'Say the line out loud, then the host taps your token on the shared screen.'),
      ...d.tokens.map((id) => { const t = NR.PARTY_TOKENS[id]; return el('div.trait', el('b', `${t.icon} ${t.name}`), el('div', el('i', t.say)), el('div.muted', t.desc)); }),
      el('h3', `🎁 Your ${d.brand} cards`),
      el('p.muted', d.baiter ? 'These are FAKE — but they look real. Read them confidently. Every one they redeem is +60 for you.'
        : `Only read these once the banner says 💳 AGREES TO PAY. Read them truthfully — but nobody said fast. They freeze after ${PAY_SECS} seconds: +20 for you per frozen card.`),
      el('div.cards', ...d.cards.map((c) => el('div.gcard', el('span', NR.money(c.value)), el('b.mono', c.code)))),
      el('h3', '🎭 Reading the banner'),
      el('table.cues', ...CUE_LEGEND.map(([i, t, how]) => el('tr', el('td', i), el('td', el('b', t)), el('td', how)))),
      el('p.muted', { style: { marginTop: '10px' } }, 'You can\'t hang up on your own: the game decides when you\'ve had enough. Stay in character!'));
    const hide = el('button', { onclick: () => { card.classList.toggle('blur'); hide.textContent = card.classList.contains('blur') ? '👁 Show' : '🙈 Hide'; } }, '🙈 Hide');
    boot.replaceChildren(el('div.victim-wrap', el('div.row', { style: { justifyContent: 'space-between', width: '100%' } }, el('b', 'Code ' + d.code), hide,
      el('button', { onclick: () => NR.victimScreen() }, 'New code')), card));
  }
})(window.NR);
