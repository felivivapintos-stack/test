// Party mode: Scammers vs Baiters. One screen runs the call center (share it
// on Discord or a TV); the victim opens the same game on their phone, types a
// code and gets a secret character sheet. No server: both devices derive the
// same character from the code.
(function (NR) {
  'use strict';
  const el = NR.el;
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
  ];

  const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

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
    NR.seed((Date.now() ^ 0x5bd1e995) >>> 0);
    return { code: norm, v, baiter, cards, amount: values.reduce((a, b) => a + b, 0), objective, brand };
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

  NR.startParty = function () {
    const ta = el('textarea#party-names', { rows: 6, style: { width: '100%' }, placeholder: 'One name per line (2–8 players)' });
    ta.value = NR.store.get('partyNames', ['Ana', 'Bruno', 'Carla']).join('\n');
    NR.modal('🎉 Scammers vs Baiters', el('div',
      el('p', 'Everyone joins a voice call (Discord works great). This screen is the call center — share it. Each round one player is the ', el('b', 'caller'), ' and another is the ', el('b', 'victim'), ', who plays a secret character from their phone.'),
      el('p.muted', 'Some victims are secretly scambaiters with fake gift cards. Callers score by redeeming real cards; victims score by wasting time, completing a secret objective and baiting the caller.'),
      el('label', { for: 'party-names' }, 'Players'), ta),
    [{ label: 'Cancel' }, { label: 'Start party', cls: 'primary', fn: () => {
      const players = ta.value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
      if (players.length < 2) { NR.toast('Add at least 2 players.', 'warn'); return; }
      NR.store.set('partyNames', players);
      P = { players, round: 0, lap: 1, scores: Object.fromEntries(players.map((p) => [p, 0])), cur: null, history: [] };
      NR.newGame('party');
      NR.G.clockedIn = true;
      NR.G.cash = 0;
      NR.$('#boot').hidden = true;
      NR.$('#desktop').hidden = false;
      NR.closeAll();
      NR.renderIcons();
      NR.emit('update');
      NR.openApp('phone');
      nextRound();
    } }]);
  };

  function nextRound() {
    const n = P.players.length;
    const scammer = P.players[P.round % n];
    const victim = P.players[(P.round + P.lap) % n] === scammer ? P.players[(P.round + 1) % n] : P.players[(P.round + P.lap) % n];
    P.cur = { scammer, victim, code: newCode(), real: 0, bait: 0, call: null, done: false };
    NR.G.pending = [];
    NR.closeApp('redeem');
    NR.closeApp('remote');
    NR.openApp('phone');
    NR.modal(`Round ${P.round + 1}`, el('div', { style: { textAlign: 'center' } },
      el('p', { style: { fontSize: '18px' } }, '📞 ', el('b', scammer), ' is the caller.  🎭 ', el('b', victim), ' is the victim.'),
      el('p', el('b', victim), ': open this game on your phone, tap ', el('b', '📱 I\'m the victim'), ' and enter:'),
      el('div', { style: { font: '900 44px var(--mono)', letterSpacing: '8px', margin: '8px 0' } }, P.cur.code),
      el('p.muted', 'Keep your phone screen private. ' + scammer + ', no peeking!')),
    [{ label: 'Victim is ready', cls: 'primary' }]);
  }

  function dialVictim(scamId) {
    const data = NR.partyData(P.cur.code);
    const c = new NR.Call(data.v, scamId, { upgrades: {}, deck: NR.STARTER_DECK, handSize: 4 });
    c.party = { baiter: data.baiter, cards: data.cards };
    c.amount = data.amount;
    c.ctx.amount = NR.money(data.amount);
    c.ctx.gift = data.brand;
    P.cur.call = c; P.cur.data = data;
    NR.call = c;
    c.say('sys', `📞 ${P.cur.victim} picks up as ${data.v.first} ${data.v.last}. Victim, you're on! Caller: say your lines out loud, then play the matching card.`);
    NR.sfx('pickup');
    NR.refreshApp('phone');
    NR.emit('update');
  }

  NR.on('redeemed', (hit) => {
    if (!P || !P.cur || !hit.party) return;
    if (hit.baiter) P.cur.bait++; else P.cur.real += hit.value;
  });

  function roundPoints(objectiveDone) {
    const c = P.cur.call, base = P.cur.data, turns = c ? c.turns : 0;
    const s = { caller: 0, victim: 0, notes: [] };
    const add = (who, pts, why) => { s[who] += pts; s.notes.push(`${who === 'caller' ? P.cur.scammer : P.cur.victim} ${pts >= 0 ? '+' : ''}${pts} — ${why}`); };
    if (P.cur.real) add('caller', Math.round(P.cur.real / 10), `redeemed ${NR.money(P.cur.real)}`);
    if (P.cur.bait) { add('caller', -50 * P.cur.bait, `redeemed ${P.cur.bait} fake card(s)`); add('victim', 60 * P.cur.bait, 'baited the caller'); }
    if (c && c.outcome === 'reported') { add('caller', 50, 'unmasked the scambaiter'); add('victim', -30, 'got caught baiting'); }
    if (c && c.outcome === 'falsereport') { add('caller', -30, 'accused an innocent victim'); add('victim', 20, 'falsely accused'); }
    if (c && ['hangup', 'bored'].includes(c.outcome)) add('victim', 40, 'didn\'t fall for it');
    if (turns) add('victim', turns * 3, `wasted ${turns} turns`);
    if (objectiveDone) add('victim', 40, 'secret objective: ' + base.objective);
    return s;
  }

  function endRound() {
    const data = P.cur.data;
    if (NR.call && NR.call.state !== 'done') NR.call.hangUp();
    const v = data.v;
    const finish = (done) => {
      const s = roundPoints(done);
      P.scores[P.cur.scammer] += s.caller;
      P.scores[P.cur.victim] += s.victim;
      P.history.push({ ...s, scammer: P.cur.scammer, victim: P.cur.victim });
      NR.call = null;
      NR.refreshApp('phone');
      NR.modal('Round results', el('div', el('ul', ...s.notes.map((t) => el('li', t))), scoreboard()),
        [{ label: P.round + 1 >= P.players.length * P.lap ? 'Final results' : 'Next round', cls: 'primary', fn: () => {
          P.round++;
          if (P.round >= P.players.length * P.lap) finalResults(); else nextRound();
        } }]);
    };
    NR.modal('The reveal', el('div',
      el('p', el('b', P.cur.victim), ' was playing ', el('b', `${v.first} ${v.last}, ${v.age}`), ' — ',
        data.baiter ? el('b', { style: { color: 'var(--bad)' } }, '😈 a SECRET SCAMBAITER') : el('b', { style: { color: 'var(--good)' } }, '🎭 a real victim'), '.'),
      el('p', 'Traits: ', v.traits.map((t) => NR.TRAITS[t].label).join(', ')),
      el('p', 'Secret objective: ', el('i', data.objective)),
      el('p', el('b', 'Did they pull it off?'), ' (Everyone votes.)')),
    [{ label: 'No', fn: () => finish(false) }, { label: 'Yes!', cls: 'primary', fn: () => finish(true) }]);
  }

  function scoreboard() {
    const rows = Object.entries(P.scores).sort((a, b) => b[1] - a[1]);
    return el('table.list', el('tr', el('th', 'Player'), el('th', 'Points')), ...rows.map(([p, s], i) => el('tr', el('td', (i === 0 ? '👑 ' : '') + p), el('td', el('b', s)))));
  }

  function finalResults() {
    const [winner] = Object.entries(P.scores).sort((a, b) => b[1] - a[1])[0];
    NR.modal('🏆 Final results', el('div', { style: { textAlign: 'center' } }, el('div.big', `${winner} wins!`), scoreboard()),
      [{ label: 'Title screen', fn: () => location.reload() }, { label: 'Another lap', cls: 'primary', fn: () => { P.lap++; nextRound(); } }]);
  }

  // The phone app shows this instead of the lead list in party mode.
  NR.partyPanel = function (body) {
    if (!P || !P.cur) { body.replaceChildren(el('p.muted', 'Party not started.')); return; }
    const c = P.cur.call;
    const scams = Object.keys(NR.SCAMS).filter((s) => !NR.SCAMS[s].elderlyOnly);
    const sel = el('select#party-scam', ...scams.map((s) => el('option', { value: s }, `${NR.SCAMS[s].name} — ${NR.SCAMS[s].blurb}`)));
    const pend = NR.G.pending.filter((p) => !p.done).length;
    body.replaceChildren(
      el('h3', `🎉 Round ${P.round + 1}: 📞 ${P.cur.scammer} vs 🎭 ${P.cur.victim}`),
      c ? el('div', el('p', `Call finished (${c.outcome}). `, pend ? `${pend} card(s) still to redeem — ask ${P.cur.victim} to read them and type them into 🎁 Redeem.` : ''),
        el('div.row', el('button', { onclick: () => NR.openApp('redeem') }, '🎁 Open Redeem'), el('button.primary', { onclick: endRound }, '🏁 End round & reveal')))
        : el('div', el('p', 'Caller, pick your script. You know nothing about this victim yet — find their weak spots.'),
          el('div.row', sel, el('button.primary', { onclick: () => dialVictim(sel.value) }, `📞 Call ${P.cur.victim}`))),
      el('h3', { style: { marginTop: '12px' } }, 'Scoreboard'), scoreboard(),
      el('details', { style: { marginTop: '10px' } }, el('summary', 'How scoring works'), el('ul',
        el('li', 'Caller: +1 per $10 redeemed · +50 for unmasking a baiter · −30 for a false accusation · −50 per fake card redeemed.'),
        el('li', 'Victim: +3 per turn wasted · +40 if the caller fails · +40 for the secret objective · +60 per fake card the caller redeems · −30 if unmasked.'))));
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
        : 'You are a real, trusting person. React honestly to how each line lands on the shared screen: if Trust jumps, warm up; if Suspicion spikes, push back.'),
      el('h3', 'Your personality'),
      ...guides.map((g) => el('div.trait', el('b', g.label), ` — your character ${g.reveal}.`,
        g.strong.length ? el('div', '👍 Falls for: ' + g.strong.join(', ')) : null,
        g.weak.length ? el('div', '👎 Hates: ' + g.weak.join(', ')) : null)),
      el('p', '📌 Bring this up when they ask about your life: ', el('b', v.detail.text)),
      el('h3', '🎯 Secret objective'), el('p.objective', d.objective),
      el('h3', `🎁 Your ${d.brand} cards`),
      el('p.muted', d.baiter ? 'These are FAKE — but they look real. Read them confidently. Every one they redeem is +60 for you.'
        : 'Only read these once the screen says you agreed to pay. Read them truthfully — slowly is fine.'),
      el('div.cards', ...d.cards.map((c) => el('div.gcard', el('span', NR.money(c.value)), el('b.mono', c.code)))),
      el('p.muted', { style: { marginTop: '10px' } }, 'You can\'t hang up on your own: the game decides when you\'ve had enough. Stay in character!'));
    const hide = el('button', { onclick: () => { card.classList.toggle('blur'); hide.textContent = card.classList.contains('blur') ? '👁 Show' : '🙈 Hide'; } }, '🙈 Hide');
    boot.replaceChildren(el('div.victim-wrap', el('div.row', { style: { justifyContent: 'space-between', width: '100%' } }, el('b', 'Code ' + d.code), hide,
      el('button', { onclick: () => NR.victimScreen() }, 'New code')), card));
  }
})(window.NR);
