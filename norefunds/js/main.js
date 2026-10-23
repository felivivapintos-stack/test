// Boot, title screen, day flow, reviews, endings, virus and raid events.
(function (NR) {
  'use strict';
  const el = NR.el;
  const G = () => NR.G;

  // ------------------------------------------------------------- title
  function title() {
    const boot = NR.$('#boot');
    const hasSave = !!NR.store.get('save', null);
    const today = new Date().toISOString().slice(0, 10);
    const best = NR.store.get('daily.' + today, null);
    boot.hidden = false;
    boot.style.justifyContent = '';
    boot.replaceChildren(
      el('div.logo', 'NO REFUNDS'),
      el('div.stamp', 'A SCAM CALL-CENTER SIM'),
      el('p.sub', 'Ten days. One headset. A deck of lies. Read your marks, hit quota, dodge the cops — and find out what kind of person you are when nobody is watching.'),
      el('div.menu',
        hasSave ? el('button.primary', { onclick: () => { if (NR.loadGame()) enter(); } }, '▶ Continue') : null,
        el('button' + (hasSave ? '' : '.primary'), { onclick: () => confirmNew('story') }, '★ New Story (10 days)'),
        el('button', { onclick: () => confirmNew('endless') }, '∞ Endless Shift'),
        el('button', { onclick: () => { NR.newGame('daily', NR.hashStr(today)); enter(); } }, `📅 Daily Challenge ${today}${best ? ' — best ' + NR.money(best) : ''}`),
        el('button', { onclick: () => NR.startParty() }, '🎉 Party: Scammers vs Baiters'),
        el('button', { onclick: () => NR.victimScreen() }, '📱 I\'m the victim (party code)'),
        el('button', { onclick: () => settingsModal() }, '⚙ Settings')),
      el('p.tip', NR.pick(NR.TIPS)),
      el('div.fine', 'Satire. All brands are fictional. Runs offline · records nothing · v0.3'));
  }
  function confirmNew(mode) {
    if (NR.store.get('save', null)) {
      NR.modal('Start over?', el('p', 'This replaces your current save.'), [{ label: 'Cancel' }, { label: 'Start', cls: 'primary', fn: () => { NR.newGame(mode); enter(); } }]);
    } else { NR.newGame(mode); enter(); }
  }
  function settingsModal() {
    const box = el('div');
    NR.apps.settings.render(box);
    NR.modal('Settings', box, [{ label: 'Close' }]);
  }

  function enter() {
    NR.$('#boot').hidden = true;
    NR.$('#desktop').hidden = false;
    NR.closeAll();
    NR.renderIcons();
    updateTray();
    if (G().clockedIn) { NR.resumeDay(); NR.openApp('phone'); NR.toast('Shift resumed.', 'good'); }
    else if (G().lastReview && G().lastReview.day === G().day - 1) shopPhase();
    else dayIntro();
  }

  // ------------------------------------------------------------- day flow
  function dayIntro() {
    const g = G();
    NR.story.dayStart(g);
    const q = NR.quota(g.day);
    const isDaily = g.mode === 'daily';
    NR.modal(`Day ${g.day}`, el('div', { style: { textAlign: 'center' } },
      el('div.big', `DAY ${g.day}${g.mode === 'story' ? ' / 10' : isDaily ? ' / 3' : ''}`),
      el('p', 'Quota: ', el('b', NR.money(q)), g.strikes ? el('span', { style: { color: 'var(--bad)' } }, `  ·  Strikes: ${g.strikes}/2`) : null),
      el('p.muted', `Wallet ${NR.money(g.cash)} · Heat ${Math.round(g.heat)}`),
      g.mail.some((m) => !m.read) ? el('p', '✉️ You have unread mail.') : null,
      el('p.muted', { style: { fontSize: '12px' } }, NR.pick(NR.TIPS))),
    [{ label: '🕘 Clock in', cls: 'primary', fn: () => {
      NR.startDay();
      if (g.mail.some((m) => !m.read)) NR.openApp('mail');
      if (g.day === 1 && g.mode === 'story') NR.openApp('help');
      NR.openApp('phone');
    } }]);
  }

  NR.on('dayEnd', (r) => {
    const g = G();
    NR.shutUp();
    NR.closeApp('remote');
    const calls = r.calls.length ? el('table.list', el('tr', el('th', 'Mark'), el('th', 'Script'), el('th', 'Result')),
      ...r.calls.map((c) => el('tr', el('td', c.name), el('td', c.scam), el('td', outcomeLabel(c))))) : el('p.muted', 'No calls.');
    const quotes = r.quotes.filter((q) => q.kind === 'best').sort((a, b) => b.score - a.score).slice(0, 2)
      .concat(r.quotes.filter((q) => q.kind === 'worst').sort((a, b) => a.score - b.score).slice(0, 1));
    const bossKey = r.fired ? 'fired' : !r.made ? 'miss' : r.grade === 'S' || r.grade === 'A' ? 'great' : 'ok';
    NR.modal(`End of Day ${r.day} — Performance Review`, el('div',
      el('div.row', el('div', { class: 'grade ' + r.grade, style: { width: '110px' } }, r.grade),
        el('div.grow', el('div', 'Gross: ', el('b', NR.money(r.gross)), ' / quota ', NR.money(r.quota)), r.bonus ? el('div', 'Bonus: ', el('b', NR.money(r.bonus))) : null,
          el('div', 'Wallet: ', el('b', NR.money(g.cash))), r.expired ? el('div', { style: { color: 'var(--bad)' } }, `${r.expired} unredeemed code(s) expired.`) : null,
          el('div.quote', '“' + NR.pick(NR.BOSS_LINES[bossKey]) + '” — Vance'))),
      el('h3', { style: { marginTop: '10px' } }, '📼 Call Analysis'),
      quotes.length ? quotes.map((q) => el('div.quote' + (q.kind === 'worst' ? '.worst' : ''), `${q.kind === 'best' ? '🔥 Best line' : '💀 Worst line'} (to ${q.who}): “${q.text}”`)) : el('p.muted', 'Nothing worth quoting.'),
      el('h3', { style: { marginTop: '10px' } }, '📞 Calls'), calls),
    [{ label: 'Continue', cls: 'primary', fn: () => afterReview(r) }]);
  });

  function outcomeLabel(c) {
    const m = { paid: ['💰 ' + NR.money(c.amount), 'good'], hangup: ['Hung up', 'bad'], bored: ['Lost interest', 'bad'], cashier: ['Cashier stopped it', 'bad'], baiter: ['📹 Baited!', 'bad'], reported: ['🚩 Baiter caught', 'good'], falsereport: ['False accusation', 'bad'], dropped: ['You hung up', ''], warned: ['You warned her', 'good'] }[c.outcome] || [c.outcome, ''];
    return el('span.tag.' + (m[1] || 'x'), m[0]);
  }

  function afterReview(r) {
    const g = G();
    const end = NR.story.ending(g, r);
    if (end) return showEnding(end);
    if (g.mode === 'daily' && r.day >= 3) return dailyDone();
    shopPhase();
  }

  function shopPhase() {
    NR.openApp('shop');
    const g = G();
    const unread = g.news.filter((n) => !n.read).length;
    if (unread) NR.openApp('news');
    const bar = el('div', el('p', 'Night. Spend your cut at DeskMart, read the news, then start tomorrow.'));
    NR.modal('After hours', bar, [{ label: '🛒 Shop first', fn: () => setTimeout(nextDayButton, 50) }, { label: `☀ Start Day ${g.day}`, cls: 'primary', fn: dayIntro }]);
  }
  function nextDayButton() {
    if (NR.$('#nextday')) return;
    const b = el('button.primary#nextday', { style: { position: 'absolute', top: '10px', right: '10px', zIndex: 9400, fontSize: '15px' }, onclick: () => { b.remove(); dayIntro(); } }, `☀ Start Day ${G().day} →`);
    NR.$('#desktop').append(b);
  }

  function dailyDone() {
    const g = G();
    const today = new Date().toISOString().slice(0, 10);
    const prev = NR.store.get('daily.' + today, 0);
    if (g.gross > prev) NR.store.set('daily.' + today, g.gross);
    NR.store.del('save');
    NR.modal('Daily Challenge complete', el('div.ending', el('div.big', NR.money(g.gross)), el('p', prev && g.gross <= prev ? `Your best today: ${NR.money(prev)}` : 'New personal best for today!'),
      el('p.muted', 'Everyone gets the same leads today. Share your score.')),
    [{ label: 'Title screen', cls: 'primary', fn: () => location.reload() }]);
  }

  function showEnding(id) {
    const g = G();
    const e = NR.ENDINGS[id];
    NR.shutUp();
    if (id === 'witness') NR.achieve('redeemed', true);
    if (id === 'kingpin') NR.achieve('kingpin', true);
    const seen = NR.store.get('endings', {}); seen[id] = true; NR.store.set('endings', seen);
    NR.store.del('save');
    const hurt = g.victims.length, lost = g.victims.reduce((a, v) => a + v.amount, 0);
    NR.modal('THE END', el('div.ending',
      el('div', { style: { fontSize: '60px' } }, e.icon), el('div.big', e.title),
      el('p', { style: { textAlign: 'left', lineHeight: 1.5 } }, e.text(g)),
      el('p.muted', `${hurt} people lost ${NR.money(lost)}. You kept ${NR.money(g.cash)}. Endings found: ${Object.keys(seen).length}/${Object.keys(NR.ENDINGS).length}.`),
      el('div.panel', { style: { textAlign: 'left', marginTop: '10px' } }, el('b', 'In real life'),
        el('ul', ...NR.TIPS.slice(0, 5).map((t) => el('li', t.replace('Real fact: ', '')))),
        el('p.muted', 'If it happened to someone you know: tell them it isn\'t their fault, call their bank right away, and report it to the police or the national fraud line.'))),
    [{ label: '∞ Endless Shift', fn: () => { NR.newGame('endless'); enter(); } }, { label: 'Title screen', cls: 'primary', fn: () => location.reload() }]);
  }
  NR.on('ending', showEnding);

  // ------------------------------------------------------------- tray
  function updateTray() {
    const g = G();
    if (!g) return;
    const q = NR.quota(g.day);
    NR.$('#tray-day').textContent = `Day ${g.day}`;
    NR.$('#qfill').style.width = Math.min(100, (g.grossToday / q) * 100) + '%';
    NR.$('#qtext').textContent = g.mode === 'party' ? '🎉 Party' : `${NR.money(g.grossToday)}/${NR.money(q)}`;
    NR.$('#tray-cash').textContent = '👛 ' + NR.money(g.cash);
    NR.$('#hfill').style.width = Math.min(100, g.heat) + '%';
    NR.$('#tray-clock').textContent = g.clockedIn ? NR.clockStr() : 'Off duty';
    NR.$('#tray-sound').textContent = NR.settings.sound ? '🔊' : '🔇';
  }
  NR.on('tick', () => { updateTray(); });
  NR.on('update', () => { updateTray(); NR.renderIcons(); NR.refreshAll(); });
  NR.on('hour', () => { if (!NR.call && NR.chance(0.25)) NR.toast(NR.pick(['Vance: "Phones, people! PHONES!"', 'Vance walks the floor, staring at your screen.', 'Desk 4 just closed a $900 grandma. Vance rings the bell.', 'The coffee machine is broken again.']), 'warn'); });

  // ------------------------------------------------------------- virus
  const POPS = ['⚠ YOUR PC HAS 4,812 VIRUSES', '🎉 CONGRATULATIONS! You won an iPhone 47', '💾 Download more RAM now!', '👋 Greetings from the scambaiter you just met', '📞 CALL WINDOZE SUPPORT NOW (ironic, isn\'t it?)', '🦜 SAY HELLO, CAPTAIN', '🔒 Your files are… fine, actually. Just annoyed.'];
  NR.on('virus', () => {
    NR.toast('🦠 VIRUS! Close the popups!', 'bad');
    let n = 0;
    const iv = setInterval(() => {
      if (++n > 9) { clearInterval(iv); return; }
      NR.sfx('popup');
      const p = el('div.virus-pop', { style: { left: NR.ri(0, Math.max(0, window.innerWidth - 240)) + 'px', top: NR.ri(0, Math.max(0, window.innerHeight - 200)) + 'px' } },
        el('div.titlebar', el('span.t', 'Error'), el('button', { onclick: () => p.remove() }, '✕')),
        el('div.vb', el('p', NR.pick(POPS)), el('button', { onclick: () => { p.remove(); } }, 'OK')));
      NR.$('#desktop').append(p);
    }, 900);
  });

  // ------------------------------------------------------------- raid
  NR.on('raid', ({ forced }) => {
    if (NR.eventActive) return;
    NR.eventActive = true;
    NR.paused = true;
    NR.sfx('alarm');
    const doRaid = () => {
      const items = ['📒', '📱', '💳', '🗂️', '💻', '🧾', '📼'];
      let left = items.length, t = 9.0;
      const hud = el('div.hud', '🚨 RAID! Destroy the evidence! ', el('span#raidt', t.toFixed(1)), 's');
      const box = el('div.raid', hud);
      for (const it of items) {
        const b = el('button.ev', { style: { left: NR.ri(5, 85) + '%', top: NR.ri(15, 80) + '%' }, onclick: () => { b.remove(); NR.sfx('click'); if (--left === 0) finish(true); } }, it);
        box.append(b);
      }
      document.body.append(box);
      const iv = setInterval(() => { t -= 0.1; const s = NR.$('#raidt'); if (s) s.textContent = Math.max(0, t).toFixed(1); if (t <= 0) finish(false); }, 100);
      function finish(ok) {
        clearInterval(iv); box.remove();
        NR.eventActive = false; NR.paused = false;
        if (NR.call && NR.call.state !== 'done') { NR.call.say('sys', 'The line went dead during the raid.'); NR.call.end('dropped'); }
        NR.raidResult(ok);
        if (ok) NR.modal('Close call', el('p', 'The cops found a room full of people "doing customer service". Heat drops — for now.'), [{ label: 'Back to work', cls: 'primary' }]);
      }
    };
    NR.modal(forced ? '🚨 POLICE!' : '🚨 Someone yells "COPS!"', el('p', forced ? 'Your heat maxed out. They\'re at the door.' : 'Blue lights outside the window.'), [{ label: 'Destroy the evidence!', cls: 'danger', fn: doRaid }]);
  });

  // ------------------------------------------------------------- wiring
  window.addEventListener('DOMContentLoaded', () => {
    NR.$('#start-btn').addEventListener('click', (e) => { e.stopPropagation(); NR.toggleStart(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#start-menu')) NR.toggleStart(false); });
    NR.$('#tray-sound').addEventListener('click', () => { NR.settings.sound = !NR.settings.sound; NR.saveSettings(); if (!NR.settings.sound) { NR.shutUp(); NR.holdMusic(false); } updateTray(); });
    window.addEventListener('resize', () => NR.renderIcons());
    if (location.hash === '#victim') NR.victimScreen(); else title();
  });
  NR.title = title;
})(window.NR);
