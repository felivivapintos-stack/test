// DeskOS applications.
(function (NR) {
  'use strict';
  const el = NR.el;
  const G = () => NR.G;

  const avatar = (v) => v.age >= 65 ? (v.female ? '👵' : '👴') : v.age >= 40 ? (v.female ? '👩' : '👨') : '🧑';

  // =================================================================== PHONE
  let typed = '';
  let mic = null;
  let storeTimer = null;

  function knownMult(c, id) {
    const tac = NR.TACTICS[id], base = tac.base || id;
    let m = 1;
    for (const tr of c.v.known) { const mods = NR.TRAITS[tr].mods; m *= mods[id] != null ? mods[id] : mods[base] != null ? mods[base] : 1; }
    m *= c.scam.mods[base] || 1;
    if (base === 'authority' && c.up.badge) m *= 1.4;
    if (c.last === base) m *= 0.5;
    return m;
  }

  function meter(label, val, color, need) {
    return el('div.meter', el('div.row', el('span.grow', label), el('b', Math.round(val))),
      el('div.bar', el('div', { style: { width: val + '%', background: color } }), need != null ? el('div.need', { style: { left: need + '%' }, title: 'Needed for a fair Ask' }) : null));
  }

  function victimPanel(c) {
    const v = c.v;
    const hidden = v.traits.length - v.known.length;
    const st = c.scam.stages[c.stage];
    return el('div.vpanel.panel',
      el('div.row', el('span', { style: { fontSize: '34px' } }, avatar(v)), el('div', el('div.vname', `${v.first} ${v.last}`), el('div.muted', `${v.age} · ${v.city}`))),
      el('div', ...v.known.map((t) => el('span.tag.k', { title: NR.TRAITS[t].reveal }, NR.TRAITS[t].label)), ...Array.from({ length: hidden }, () => el('span.tag.q', { title: 'Hidden trait — Chit-Chat or hit a weakness to reveal' }, '???'))),
      el('div.muted', '📌 ', v.detailKnown ? v.detail.text : '???'),
      meter('Trust', c.trust, 'var(--trust)', st ? st.need : null),
      meter('Suspicion', c.susp, 'var(--susp)'),
      el('div.meter', el('div.row', el('span.grow', 'Patience'), el('b', Math.max(0, c.patience))),
        el('div.pips', ...Array.from({ length: c.maxPatience }, (_, i) => el('span', { class: i < c.patience ? '' : 'off' })))),
      c.press ? el('div.muted', `⚡ Pressure +${Math.round(c.press)}% on next Ask`) : null,
      el('div', el('b', c.scam.name), el('span.muted', ' — ' + c.scam.brand)),
      el('div.stages', ...c.scam.stages.map((s, i) => el('div', { class: i < c.stage ? 'done' : i === c.stage ? 'cur' : '' }, (i < c.stage ? '✓ ' : '') + s.name + (i === c.stage ? ` (need ${s.need})` : '')))),
    );
  }

  function transcript(c) {
    const box = el('div.transcript.panel');
    for (const m of c.log) {
      if (m.who === 'fx') { box.append(el('div.fx', { html: m.text })); continue; }
      const cls = ['msg', m.who, m.tag && ['great', 'bad', 'code', 'tell'].includes(m.tag) ? m.tag : ''];
      if (m.tag === 'tell' && c.up.detector) cls.push('radar');
      box.append(el('div', { class: cls.join(' ') }, m.who === 'you' && m.tag ? el('span.tagline', m.tag) : null, m.text));
    }
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 0);
    return box;
  }

  function fxLine(res) {
    if (!res) return;
    const parts = [];
    if (res.dTrust) parts.push(`<span class="${res.dTrust > 0 ? 'p' : 'n'}">Trust ${res.dTrust > 0 ? '+' : ''}${res.dTrust}</span>`);
    if (res.dSusp) parts.push(`<span class="${res.dSusp > 0 ? 'n' : 'p'}">Suspicion ${res.dSusp > 0 ? '+' : ''}${res.dSusp}</span>`);
    for (const f of res.flags || []) parts.push(`<span class="c">${f}</span>`);
    for (const r of res.reveals || []) parts.push(`<span class="c">🔍 ${r === 'detail' ? 'Learned a personal detail' : 'Revealed: ' + NR.TRAITS[r.split(':')[1]].label}</span>`);
    if (parts.length) NR.call.log.push({ who: 'fx', text: parts.join(' · ') });
    if ((res.flags || []).some((f) => f.startsWith('COMBO'))) { NR.sfx('combo'); G().stats.combos++; NR.achieve('combo', true); }
    else if (res.level === 'great') NR.sfx('good'); else if (res.level === 'bad') NR.sfx('bad'); else NR.sfx('card');
    if ((res.flags || []).some((f) => f.startsWith('Personal'))) NR.achieve('personal', true);
  }

  async function doPlay(i) {
    const c = NR.call;
    if (!c || c.busy) return;
    const text = typed;
    typed = '';
    let res;
    if (NR.llm && NR.llm.enabled() && c.state === 'talk') {
      c.busy = true; NR.refreshApp('phone');
      res = await NR.llm.play(c, i, text);
      c.busy = false;
    } else res = c.play(i, text);
    fxLine(res);
    NR.advance(2);
    after(c);
  }
  function doAsk() {
    const c = NR.call;
    if (!c || c.busy) return;
    const r = c.ask(typed);
    typed = '';
    if (r) { c.log.push({ who: 'fx', text: r.ok ? `<span class="p">✔ Ask succeeded (${Math.round(r.p * 100)}%)</span>` : `<span class="n">✘ Ask failed (${Math.round(r.p * 100)}%) · Suspicion +12</span>` }); NR.sfx(r.ok ? 'good' : 'bad'); }
    NR.advance(2);
    after(c);
  }
  function after(c) {
    if (c.state === 'store') startStore(c);
    if (c.remote && !c._remoteOpened) { c._remoteOpened = true; NR.openApp('remote'); }
    if (c.state === 'reading' && !c._payOpened) { c._payOpened = true; NR.openApp(c.scam.pay === 'gift' ? 'redeem' : 'terminal'); NR.openApp('phone'); }
    NR.refreshApp('phone');
    NR.refreshApp('remote');
    NR.emit('update');
    NR.emit('callChanged', c);
  }

  function startStore(c) {
    if (storeTimer) return;
    NR.holdMusic(true);
    c._store = 0;
    storeTimer = setInterval(() => {
      c._store += 5;
      const bar = NR.$('#storebar');
      if (bar) bar.style.width = c._store + '%';
      if (c._store % 25 === 0) NR.advance(3);
      if (c._store >= 100) {
        clearInterval(storeTimer); storeTimer = null;
        NR.holdMusic(false);
        c.storeArrive();
        after(c);
      }
    }, 250);
  }

  function callView(body, c) {
    const st = c.scam.stages[c.stage];
    const controls = el('div.controls');
    if (c.state === 'talk' || c.state === 'cashier') {
      controls.append(el('div.hand', ...c.hand.map((id, i) => {
        const t = NR.TACTICS[id];
        const m = knownMult(c, id);
        return el('button.card' + (t.special ? '.special' : ''), { disabled: c.busy, title: t.desc + ` [key ${i + 1}]`, onclick: () => doPlay(i) },
          Math.abs(m - 1) > 0.01 ? el('span.cm.' + (m > 1 ? 'up' : 'down'), '×' + m.toFixed(1)) : null,
          el('span.ci', t.icon), el('span.cn', t.name), el('span.cd', t.desc));
      })));
      const inp = el('input', { type: 'text', placeholder: c.state === 'cashier' ? 'Tell them what to say to the cashier… then pick a card' : 'Say it your way (optional) — then click a card or Ask. Enter = auto-pick.', value: typed,
        oninput: (e) => { typed = e.target.value; }, onkeydown: (e) => {
          if (e.key !== 'Enter') return;
          const tac = NR.Call.classify(typed);
          const idx = c.hand.findIndex((h) => h === tac || NR.TACTICS[h].base === tac);
          if (idx >= 0) doPlay(idx); else NR.toast(tac ? `No ${NR.TACTICS[tac].name} card in hand — click a card to play your line.` : 'Pick a card to deliver that line.', 'warn');
        } });
      const micBtn = NR.micSupported ? el('button.mic' + (mic ? '.on' : ''), { title: 'Speak (uses your browser\'s speech recognition; nothing is recorded)', onclick: () => {
        if (mic) { mic.stop(); mic = null; NR.refreshApp('phone'); return; }
        mic = NR.listen((s) => { typed = s; inp.value = s; }, () => { mic = null; NR.refreshApp('phone'); });
        NR.refreshApp('phone');
      } }, '🎤') : null;
      controls.append(el('div.say', inp, micBtn));
      const acts = el('div.actions');
      if (c.state === 'talk' && st) acts.append(el('button.ask-btn', { disabled: c.busy, onclick: doAsk, title: st.ask.replace(/\{\w+\}/g, '…') + ' [A]' }, `🎯 Ask: ${st.name} (${Math.round(c.askChance() * 100)}%)`));
      acts.append(el('span.muted.grow', `Deck ${c.deck.length} · Discard ${c.discard.length}`));
      if (c.v.story && c.v.story.warn) acts.append(el('button', { style: { background: '#d5f5e3' }, onclick: () => {
        c.say('you', 'Nana… it\'s me. Listen. Hang up on anyone who calls about your computer. Anyone. Even if they sound nice. Even if they sound like me.', '💬 The truth');
        c.say('them', 'Sweetheart? Is that you? …Oh. Oh, honey. Okay. I promise. Come visit me, alright?', 'great');
        c.end('warned'); after(c);
      } }, '💬 Warn her'));
      acts.append(el('button', { title: 'Accuse them of being a scambaiter', onclick: () => { c.report(); after(c); } }, '🚩 Baiter!'));
      acts.append(el('button.danger', { onclick: () => { c.hangUp(); after(c); } }, '📵 Hang up'));
      controls.append(acts);
      setTimeout(() => { if (!NR.isMobile() && NR.isOpen('phone') && document.activeElement?.tagName !== 'INPUT') inp.focus(); }, 0);
    } else if (c.state === 'store') {
      controls.append(el('div', el('div.muted', `♪ On hold while ${c.v.first} buys the cards…`), el('div.store-bar', el('div#storebar', { style: { width: (c._store || 0) + '%' } }))));
    } else if (c.state === 'reading') {
      const left = c.payout.codes.filter((x) => !x.done).length;
      controls.append(el('div.actions',
        el('button', { onclick: () => NR.openApp(c.scam.pay === 'gift' ? 'redeem' : 'terminal') }, c.scam.pay === 'gift' ? '🎁 Open Redeem' : '💳 Open Terminal'),
        el('button', { onclick: () => { c.repeat(); after(c); } }, '🔁 Ask to repeat'),
        el('span.grow.muted', `${left} code(s) not redeemed yet. You can redeem after hanging up too.`),
        el('button.primary', { onclick: () => { c.finishPayment(); after(c); } }, '✅ Wrap up call')));
    }
    const grid = el('div.phone', victimPanel(c), transcript(c), controls);
    const bar = c.human && NR.mpCallBar ? NR.mpCallBar(c) : null;
    body.replaceChildren(bar ? el('div.party-call', bar, grid) : grid);
  }

  function leadsView(body) {
    const g = G();
    if (g.mode === 'mp') { NR.mpPanel(body); return; }
    if (!g.clockedIn) { body.replaceChildren(el('p.muted', 'You are not clocked in.')); return; }
    const scams = NR.unlockedScams();
    const list = el('div');
    for (const v of g.leads) {
      const opts = scams.filter((s) => !NR.SCAMS[s].elderlyOnly || v.age >= 65);
      const sel = el('select', ...opts.map((s) => el('option', { value: s }, NR.SCAMS[s].name)));
      if (v.story && v.story.scam && opts.includes(v.story.scam)) sel.value = v.story.scam;
      list.append(el('div.leadcard' + (v.story ? '.story' : ''),
        el('span.av', avatar(v)),
        el('div.grow', el('b', `${v.first} ${v.last}`), v.story ? el('span.tag', { style: { background: '#e8daef' } }, '★ ' + (v.story.tag || 'special')) : null, el('div.muted', NR.leadNote(v)), el('div.muted', `Est. savings: ${v.savings > 4000 ? '💰💰💰' : v.savings > 2200 ? '💰💰' : '💰'}`)),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, sel,
          el('button.primary', { onclick: () => {
            NR.sfx('ring');
            const r = NR.dial(v.id, sel.value);
            if (!r) return;
            if (r.voicemail) { NR.toast('📞 ' + r.voicemail, 'warn'); NR.refreshApp('phone'); return; }
            typed = '';
            setTimeout(() => NR.sfx('pickup'), 900);
            NR.refreshApp('phone');
            NR.emit('update');
          } }, '📞 Call'))));
    }
    body.replaceChildren(
      el('div.row', el('h3.grow', 'Leads'), el('button', { onclick: () => { g.leads = g.leads.filter((l) => l.story); NR.refillLeads(); NR.advance(10); NR.refreshApp('phone'); } }, '🔄 New leads (−10 min)')),
      el('p.muted', 'Pick a mark and a script. Hints in the notes tell you their known trait; the rest you learn on the call.'),
      list,
      el('details', el('summary', 'Scripts unlocked'), el('ul', ...scams.map((s) => el('li', el('b', NR.SCAMS[s].name), ' — ', NR.SCAMS[s].blurb)))));
  }

  NR.registerApp('phone', {
    title: 'Phone', icon: '📞', w: 860, h: 600, live: false,
    render(body) {
      const c = NR.call;
      if (c && c.state !== 'done') callView(body, c); else leadsView(body);
    },
    onClose() { if (mic) { mic.stop(); mic = null; } },
  });

  document.addEventListener('keydown', (e) => {
    const c = NR.call;
    if (!c || !NR.isOpen('phone') || NR.modalOpen() || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (/^[1-6]$/.test(e.key) && (c.state === 'talk' || c.state === 'cashier')) doPlay(+e.key - 1);
    if (e.key.toLowerCase() === 'a' && c.state === 'talk') doAsk();
  });

  // =================================================================== REDEEM
  function codesOf(type) {
    const g = G();
    return g.pending.concat(NR.call ? NR.call.payout.codes : []).filter((p) => p.type === type);
  }
  function redeemApp(type) {
    return function (body) {
      const codes = codesOf(type);
      const msg = el('div', { style: { minHeight: '20px', margin: '6px 0' } });
      const inp = el('input.mono.grow', { type: 'text', placeholder: type === 'gift' ? 'XXXX-XXXX-XXXX-XXXX' : '9XXX XXXX XXXX XXXX', autocomplete: 'off' });
      const go = () => {
        const r = NR.redeem(inp.value, type);
        msg.textContent = r.msg;
        msg.style.color = r.ok ? 'var(--good)' : 'var(--bad)';
        if (r.ok) inp.value = '';
        NR.refreshApp(type === 'gift' ? 'redeem' : 'terminal', { keep: msg.textContent, ok: r.ok });
        if (NR.call) NR.refreshApp('phone');
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      const extras = type === 'card' ? el('div.row', el('button', { onclick: () => {
        const ok = NR.luhnValid(inp.value);
        msg.textContent = ok ? '✔ Checksum valid.' : '✘ Checksum invalid.';
        msg.style.color = ok ? 'var(--good)' : 'var(--bad)';
      } }, '🧮 Check checksum'), el('span.muted', 'Free — doesn\'t use an attempt.')) : null;
      const arg = arguments[1];
      if (arg && arg.keep) { msg.textContent = arg.keep; msg.style.color = arg.ok ? 'var(--good)' : 'var(--bad)'; }
      body.replaceChildren(
        el('h3', type === 'gift' ? '🎁 GiftCard Balance Checker™' : '💳 CardTerminal Pro'),
        el('div.row', inp, el('button.primary', { onclick: go }, type === 'gift' ? 'Redeem' : 'Charge')),
        extras, msg,
        el('table.list', el('tr', el('th', 'From'), el('th', 'As heard'), el('th', 'Value'), el('th', 'Status')),
          ...codes.map((p) => el('tr', el('td', p.from), el('td.mono', { style: { userSelect: 'all' } }, p.spoken), el('td', NR.money(p.value)),
            el('td', p.lost ? el('span.tag.bad', 'lost') : p.done ? el('span.tag.good', 'done') : el('span.tag', `${3 - p.tries} tries`))))),
        codes.length ? null : el('p.muted', 'No codes yet. Close a deal on the phone.'));
      setTimeout(() => inp.focus(), 0);
    };
  }
  NR.registerApp('redeem', { title: 'Redeem', icon: '🎁', w: 560, h: 380, live: true, render: redeemApp('gift'),
    badge: () => (G() ? codesOf('gift').filter((p) => !p.done).length : 0) });
  NR.registerApp('terminal', { title: 'Card Terminal', icon: '💳', w: 560, h: 380, live: true, render: redeemApp('card'),
    badge: () => (G() ? codesOf('card').filter((p) => !p.done).length : 0), locked: () => G() && G().mode === 'story' && G().day < 3, lockedMsg: 'Unlocks on day 3.' });

  // =================================================================== VAULT
  NR.registerApp('vault', {
    title: 'Identity Vault', icon: '🪪', w: 480, h: 340, live: true,
    badge: () => (G() ? G().vault.length : 0),
    render(body) {
      const g = G();
      body.replaceChildren(el('h3', '🪪 Identity Vault — DarkBazaar Connect'),
        el('p.muted', 'Social Security numbers collected on calls. Brokers pay per identity.'),
        g.vault.length ? el('table.list', el('tr', el('th', 'Name'), el('th', 'SSN'), el('th', 'Offer'), el('th', '')),
          ...g.vault.map((it, i) => el('tr', el('td', `${it.name} (${it.age})`), el('td.mono', it.ssn.replace(/\d(?=\d{0,3}$)/g, '•')), el('td', NR.money(it.price)),
            el('td', el('button', { onclick: () => { const r = NR.sellIdentity(i); NR.toast(r.msg, r.ok ? 'good' : 'bad'); NR.refreshApp('vault'); } }, 'Sell'))))) : el('p', 'Empty. Use the SSN Suspension script.'));
    },
  });

  // =================================================================== REMOTE
  NR.registerApp('remote', {
    title: 'AnyDusk Remote', icon: '🖱️', w: 560, h: 420, live: false,
    locked: () => !(NR.call && NR.call.remote && NR.call.state !== 'done'), lockedMsg: 'No active remote session. Get a victim to install AnyDusk first.', hideLocked: false,
    render(body) {
      const c = NR.call;
      if (!c || !c.remote || c.state === 'done') { body.replaceChildren(el('p.muted', 'Connection closed.')); return; }
      const used = c.remoteUsed || (c.remoteUsed = {});
      const act = (k) => { const r = c.remoteAction(k); fxLine(r); after(c); };
      const screen = el('div.scr');
      if (c._rview === 'cmd') {
        screen.append(el('div.cmd', c._cmdText || ''));
      } else if (c._rview === 'bank') {
        const bal = c._fakeBal || c.v.savings;
        const slider = el('input', { type: 'range', min: 0, max: 300, value: c._inflate || 0, oninput: (e) => { c._inflate = +e.target.value; NR.refreshApp('remote'); } });
        screen.append(el('div.bankpage', el('h3', '🏦 ' + (c.scamId === 'refund' ? 'Online Banking' : 'Bank') + ' — Checking'),
          el('div', 'Balance: ', el('b.mono', NR.money(bal + (c._inflate || 0) * c.amount / 20))),
          el('p.muted', 'DevTools: "Inspect element" lets you edit what they see. Make the refund look too big — but not absurd.'),
          el('div.row', el('span', 'Fake refund'), slider, el('b.mono', NR.money((c._inflate || 0) * c.amount / 20))),
          el('button.primary', { disabled: used.bank, onclick: () => act('bank') }, used.bank ? 'Shown' : 'Show them the balance')));
      } else {
        const files = ['📁 Documents', '📁 Pictures of ' + (c.v.detail.kind === 'pet' ? c.v.detail.key : 'Grandkids'), '🌐 Internet Explorer', '🏦 Online Banking'];
        if (c.v.baiter) files.push('📄 BANK_PASSWORDS.txt');
        screen.append(el('div', el('p', `${c.v.first}'s Desktop`), ...files.map((f) => el('div', { style: { padding: '3px', cursor: 'pointer' }, onclick: () => {
          if (f.includes('PASSWORDS')) { c.remoteAction('bait'); NR.emit('virus'); after(c); return; }
          if (f.includes('Banking')) { c._rview = 'bank'; NR.refreshApp('remote'); }
        } }, f))));
      }
      body.replaceChildren(el('div.remote',
        el('div.row', { style: { padding: '4px', background: '#0b3a66', flexWrap: 'wrap' } },
          el('button', { onclick: () => { c._rview = null; NR.refreshApp('remote'); } }, '🖥 Desktop'),
          el('button', { disabled: used.events, onclick: () => act('events') }, '⚠ Event Viewer'),
          el('button', { disabled: used.cmd, onclick: () => { c._rview = 'cmd'; c._cmdText = fakeTree(); act('cmd'); } }, '⬛ CMD "tree"'),
          el('button', { onclick: () => { c._rview = 'bank'; NR.refreshApp('remote'); } }, '🏦 Bank'),
          el('button', { disabled: used.blank, onclick: () => act('blank') }, '⬛ Black screen')),
        screen));
    },
  });
  function fakeTree() {
    let s = 'C:\\Users\\Owner> tree\n';
    const dirs = ['System32', 'drivers', 'etc', 'WinSxS', 'amd64_microsoft', 'Temp', 'Prefetch', 'assembly', 'GAC_MSIL', 'Fonts', 'Logs'];
    for (let i = 0; i < 40; i++) s += '│   '.repeat(NR.ri(0, 4)) + '├───' + NR.pick(dirs) + '\n';
    return s + '\n!!! 4,812 SECURITY THREATS FOUND — HACKER CONNECTED !!!';
  }

  // =================================================================== MAIL
  NR.registerApp('mail', {
    title: 'Mail', icon: '✉️', w: 640, h: 420, live: true,
    badge: () => (G() ? G().mail.filter((m) => !m.read).length : 0),
    render(body, arg) {
      const g = G();
      if (arg && arg.open != null) this.sel = arg.open;
      const mails = g.mail.slice().reverse();
      const cur = mails.find((m) => m.id === this.sel) || mails[0];
      if (cur && !cur.read) { cur.read = true; setTimeout(() => NR.emit('update'), 0); }
      const view = el('div.view');
      if (cur) {
        view.append(el('b', cur.subj), el('div.muted', `From: ${cur.from} · Day ${cur.day}`), el('hr'), cur.body);
        if (cur.actions && !cur.done) {
          view.append(el('div.row', { style: { marginTop: '12px', flexWrap: 'wrap' } }, ...cur.actions.map((a) => el('button.primary', { onclick: () => { cur.done = true; NR.story.mailAction(cur, a.id); NR.refreshApp('mail'); } }, a.label))));
        }
      }
      body.replaceChildren(el('div.mail', el('div.lst', ...mails.map((m) => el('div', { class: (m.read ? '' : 'unread ') + (m === cur ? 'sel' : ''), onclick: () => { this.sel = m.id; NR.refreshApp('mail'); } }, m.subj, el('div.muted', { style: { fontWeight: 'normal' } }, m.from)))), view));
    },
  });

  // =================================================================== SHOP
  NR.registerApp('shop', {
    title: 'DeskMart', icon: '🛒', w: 680, h: 500, live: true,
    render(body) {
      const g = G();
      this.tab = this.tab || 'desk';
      const tabs = el('div.tabs', ...[['desk', '🗄 Desk Items'], ['cards', '🃏 Script Cards'], ['deck', '📚 My Deck']].map(([k, l]) => el('button', { class: this.tab === k ? 'on' : '', onclick: () => { this.tab = k; NR.refreshApp('shop'); } }, l)));
      let content;
      if (this.tab === 'desk') {
        content = el('div.shopgrid', ...NR.UPGRADES.map((u) => el('div.shopitem' + (g.upgrades[u.id] ? '.owned' : ''), el('span.si', u.icon), el('b', u.name), el('span.muted', u.desc),
          el('button.primary', { disabled: g.upgrades[u.id] || g.cash < u.cost, onclick: () => { NR.buyUpgrade(u.id); NR.refreshApp('shop'); } }, g.upgrades[u.id] ? 'Owned' : NR.money(u.cost)))));
      } else if (this.tab === 'cards') {
        content = el('div.shopgrid', ...NR.CARD_SHOP.map((id) => { const t = NR.TACTICS[id]; return el('div.shopitem', el('span.si', t.icon), el('b', t.name), el('span.muted', t.desc),
          el('span.muted', `In deck: ${g.deck.filter((d) => d === id).length}`),
          el('button.primary', { disabled: g.cash < NR.CARD_PRICES[id], onclick: () => { NR.buyCard(id); NR.refreshApp('shop'); } }, NR.money(NR.CARD_PRICES[id]))); }));
      } else {
        content = el('div', el('p.muted', `Your script deck (${g.deck.length} cards). Thin decks draw your best lines more often. Shredding a card costs $50 (min 8 cards).`),
          el('div.shopgrid', ...g.deck.map((id, i) => { const t = NR.TACTICS[id]; return el('div.shopitem', el('span.si', t.icon), el('b', t.name),
            el('button', { disabled: g.cash < 50 || g.deck.length <= 8, onclick: () => { NR.removeCard(i); NR.refreshApp('shop'); } }, '🗑 Shred ($50)')); })));
      }
      body.replaceChildren(el('div.row', el('h3.grow', 'DeskMart — "Tools of the trade"'), el('b', 'Wallet: ' + NR.money(g.cash))), tabs, content);
    },
  });

  // =================================================================== CASINO
  const SYMS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '💰'];
  const PAY = { '🍒': 3, '🍋': 4, '🔔': 6, '💎': 10, '7️⃣': 20, '💰': 40 };
  NR.registerApp('casino', {
    title: 'Lucky Desk Casino', icon: '🎰', w: 380, h: 380, live: false,
    render(body) {
      const g = G();
      this.reels = this.reels || ['💰', '💰', '💰'];
      const out = el('div', { style: { textAlign: 'center', minHeight: '20px' } }, this.msg || 'Three of a kind pays big. Two cherries pay ×1.');
      const spin = (bet) => {
        if (g.cash < bet || this.spinning) return;
        g.cash -= bet; g.stats.casino -= bet; this.spinning = true;
        let n = 0;
        const iv = setInterval(() => {
          this.reels = [0, 1, 2].map(() => NR.pick(SYMS));
          NR.sfx('click');
          if (++n > 10) {
            clearInterval(iv); this.spinning = false;
            // Weighted final result (house edge ~10%).
            const w = () => { const r = NR.rand(); return r < 0.32 ? '🍒' : r < 0.56 ? '🍋' : r < 0.74 ? '🔔' : r < 0.87 ? '💎' : r < 0.96 ? '7️⃣' : '💰'; };
            this.reels = [w(), w(), w()];
            const [a, b, c] = this.reels;
            let win = 0;
            if (a === b && b === c) win = bet * PAY[a];
            else if ([a, b, c].filter((s) => s === '🍒').length === 2) win = bet;
            g.cash += win; g.stats.casino += win;
            this.msg = win ? `WIN ${NR.money(win)}!` : 'The house thanks you.';
            NR.sfx(win ? 'cash' : 'bad');
            NR.achieve('gambler', g.stats.casino <= -200);
            NR.emit('update');
          }
          NR.refreshApp('casino');
        }, 70);
      };
      body.replaceChildren(el('h3', '🎰 Lucky Desk Slots'), el('div.slots', ...this.reels.map((s) => el('div', s))), out,
        el('div.row', { style: { justifyContent: 'center', marginTop: '8px' } }, ...[10, 25, 50, 100].map((b) => el('button.primary', { disabled: g.cash < b, onclick: () => spin(b) }, 'Bet $' + b))),
        el('p.muted', { style: { textAlign: 'center' } }, `Wallet ${NR.money(g.cash)} · Net ${NR.money(g.stats.casino)}`),
        el('p.muted', { style: { fontSize: '11px' } }, Object.entries(PAY).map(([s, p]) => `${s}×3 = ${p}×`).join('  ')));
    },
  });

  // =================================================================== NEWS
  NR.registerApp('news', {
    title: 'Daily Ledger News', icon: '📰', w: 560, h: 460, live: true,
    badge: () => (G() ? G().news.filter((n) => !n.read).length : 0),
    render(body) {
      const g = G();
      const hadUnread = g.news.some((n) => !n.read);
      g.news.forEach((n) => { n.read = true; });
      body.replaceChildren(el('div.news', el('h3', { style: { font: 'bold 22px Georgia, serif' } }, 'The Daily Ledger'),
        ...(g.news.length ? g.news.slice().reverse().map((n) => el('article', el('div.meta', `Day ${n.day} · ${n.section || 'Local'}`), el('h4', n.head), el('div', n.body))) : [el('p.muted', 'No news yet.')])));
      if (hadUnread) setTimeout(() => NR.emit('update'), 0);
    },
  });

  // =================================================================== LEDGER / STATS
  NR.registerApp('ledger', {
    title: 'Ledger', icon: '📊', w: 560, h: 460, live: true,
    render(body) {
      const g = G();
      const all = NR.store.get('achievements', {});
      body.replaceChildren(
        el('h3', '📊 Career'),
        el('table.list', ...[['Total gross', NR.money(g.gross)], ['Your wallet', NR.money(g.cash)], ['Calls made', g.stats.calls], ['Deals closed', g.stats.paid], ['Biggest card', NR.money(g.stats.biggest)],
          ['Combos landed', g.stats.combos], ['Baiters caught / fell for', `${g.stats.baitersCaught} / ${g.stats.baitersFell}`], ['Raids survived', g.stats.raidsSurvived], ['Strikes', g.strikes + ' / 2']].map(([a, b]) => el('tr', el('td', a), el('td', el('b', b))))),
        el('h3', { style: { marginTop: '12px' } }, `🧾 People (${g.victims.length})`),
        g.victims.length ? el('table.list', el('tr', el('th', 'Name'), el('th', 'Age'), el('th', 'City'), el('th', 'Lost')),
          ...g.victims.slice().reverse().map((v) => el('tr', el('td', v.name), el('td', v.age), el('td', v.city), el('td', NR.money(v.amount))))) : el('p.muted', 'Nobody yet.'),
        el('h3', { style: { marginTop: '12px' } }, '🏆 Achievements'),
        el('div.shopgrid', ...Object.entries(NR.ACHIEVEMENTS).map(([id, [n, d]]) => el('div.shopitem' + (all[id] ? '' : '.owned'), el('b', (all[id] ? '🏆 ' : '🔒 ') + n), el('span.muted', d)))));
    },
  });

  // =================================================================== SETTINGS
  NR.registerApp('settings', {
    title: 'Settings', icon: '⚙️', w: 520, h: 520,
    render(body) {
      const s = NR.settings;
      const chk = (k, label) => el('label.row', el('input', { type: 'checkbox', checked: s[k] !== false, onchange: (e) => { s[k] = e.target.checked; NR.saveSettings(); if (k === 'sound') NR.emit('update'); } }), label);
      const speed = el('select', { onchange: (e) => { s.speed = +e.target.value; NR.saveSettings(); NR.pauseClock(false); } },
        ...[[0.6, 'Relaxed'], [1, 'Normal'], [1.5, 'Hustle']].map(([v, l]) => el('option', { value: v, selected: s.speed == v }, l)));
      body.replaceChildren(el('h3', 'Settings'), chk('sound', 'Sound effects'), chk('music', 'Hold music'),
        el('label.row', 'Clock speed ', speed),
        el('p.muted', '🔒 Privacy: NO REFUNDS records nothing. The mic (optional) uses your browser\'s speech recognition and the text never leaves this page — unless you enable AI mode below, which sends call text to the provider you choose.'),
        NR.llm ? NR.llm.settingsPanel() : null,
        modsPanel());
    },
  });

  function modsPanel() {
    const ta = el('textarea', { rows: 5, style: { width: '100%' }, placeholder: 'Paste a mod JSON here (see mods/utility-shutoff.json)…' });
    const msg = el('div.muted');
    const list = el('div', ...NR.mods.map((m, i) => el('div.row', el('span.grow', `${m.enabled === false ? '⏸' : '✅'} ${m.data.name || 'Unnamed mod'}`),
      el('button', { onclick: () => { m.enabled = m.enabled === false; NR.store.set('mods', NR.mods); msg.textContent = 'Reload the page to apply.'; NR.refreshApp('settings'); } }, m.enabled === false ? 'Enable' : 'Disable'),
      el('button', { onclick: () => { NR.mods.splice(i, 1); NR.store.set('mods', NR.mods); msg.textContent = 'Removed. Reload the page to apply.'; NR.refreshApp('settings'); } }, 'Remove'))));
    return el('div.panel', { style: { marginTop: '10px' } }, el('h3', '🧩 Mods'),
      el('p.muted', 'Add scripts, traits, cards, lines and tips with JSON. Mods are plain data — they cannot run code.'),
      list, ta,
      el('div.row', el('button', { onclick: () => {
        try { const data = JSON.parse(ta.value); NR.validateMod(data); NR.mods.push({ data, enabled: true }); NR.store.set('mods', NR.mods); msg.textContent = `Installed "${data.name || 'mod'}". Reload the page to apply.`; ta.value = ''; }
        catch (e) { msg.textContent = '⚠ ' + e.message; }
      } }, 'Install mod'), msg));
  }

  // =================================================================== HELP
  NR.registerApp('help', {
    title: 'Employee Handbook', icon: '📘', w: 600, h: 520,
    render(body) {
      body.innerHTML = `<h3>📘 Totally Legit Solutions — Employee Handbook</h3>
<p><b>Your job:</b> hit the daily quota. Miss it twice and you're fired. You keep <b>${NR.CUT * 100}%</b> of everything you bring in.</p>
<p><b>Calls.</b> Open <b>📞 Phone</b>, pick a lead and a script. Each turn you play one <b>card</b> from your hand. Cards raise <b>Trust</b> and change <b>Suspicion</b>. Every card costs 1 <b>Patience</b>.</p>
<p><b>Ask.</b> When trust passes the black marker, press <b>🎯 Ask</b> to move the script forward. The % is your real chance. Failing raises suspicion. Rush / Scare / combos add <b>pressure</b> to the next Ask.</p>
<p><b>Traits.</b> Everyone has 2–3 traits. One is in the lead notes; the others are hidden. <b>Chit-Chat</b> reveals them, and hitting a weakness reveals it too. Cards show their multiplier against what you know (×1.7 green = weakness, red = backfire).</p>
<p><b>Your own words.</b> Type (or 🎤 speak) a line before clicking a card. If it fits the card: <b>Improv ×1.25</b>. Use their name: +2. Mention their personal detail (📌): <b>+6</b>. Press Enter to auto-pick the card that matches your words.</p>
<p><b>Combos.</b> Scare → Calm Down (Good Cop/Bad Cop), Chit-Chat → Sympathize (Rapport), Pull Rank → Rush, Techno-babble → Fake Proof, Butter Up → Dangle Prize, Fake Proof → Scare.</p>
<p><b>Payment.</b> Gift cards: they drive to the store (watch out for cashiers), then read you codes. Type them into <b>🎁 Redeem</b>. Elderly marks mishear: "(B or 8?)" — guess, or ask them to repeat. Bank cards: the <b>💳 Terminal</b> checks the Luhn checksum.</p>
<p><b>Scambaiters</b> pretend to be victims to waste your time and record you. They're weirdly eager and say odd things. Press <b>🚩 Baiter!</b> to blacklist them (+$40). Wrong guess = lost call.</p>
<p><b>Heat.</b> Every con heats you up. At 100 the cops raid you. Survive the raid by destroying evidence fast.</p>
<p><b>Keys:</b> <span class="kbd">1</span>–<span class="kbd">6</span> play card, <span class="kbd">A</span> ask.</p>
<hr><p class="muted">NO REFUNDS is satire. Brands are fictional. If anyone ever asks <i>you</i> for gift cards on the phone: hang up. It's a scam. Every time.</p>`;
    },
  });
})(window.NR);
