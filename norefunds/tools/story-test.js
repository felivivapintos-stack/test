// Plays the full 10-day story with a decent bot via the game API and reports
// the ending reached. Usage: NODE_PATH=$(npm root -g) node tools/story-test.js [witness|kingpin|plain]
const { chromium } = require('playwright');
const path = require('path');
const route = process.argv[2] || 'plain';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const res = await page.evaluate(async (route) => {
    NR.settings.voice = false; NR.settings.sound = false;
    NR.newGame('story');
    let ending = null;
    NR.on('ending', (e) => { ending = e; });
    const log = [];
    const bot = (c) => {
      let guard = 0;
      while (c.state !== 'done' && guard++ < 80) {
        if (c.v.story && c.v.story.warn && route === 'witness') { c.end('warned'); break; }
        if (c.state === 'store') { c.storeArrive(); continue; }
        if (c.state === 'reading') { for (const p of c.payout.codes) NR.redeem(p.code, p.type); c.finishPayment(); break; }
        if (c.v.baiter && c.turns > 3 && Math.random() < 0.5) { c.report(); break; }
        if (c.state === 'talk' && c.askChance() >= 0.62) { c.ask(); continue; }
        let best = 0, bv = -1e9;
        c.hand.forEach((id, i) => { const t = NR.TACTICS[id], m = c.multiplierFor(id) * (c.last === (t.base || id) ? 0.5 : 1);
          const v = (t.trust || 0) * m - (t.susp || 0) * (c.susp > 50 ? 1.5 : 0.7) + (t.press || 0) * 0.3; if (v > bv) { bv = v; best = i; } });
        c.play(best);
      }
    };
    for (let d = 1; d <= 10 && !ending; d++) {
      NR.story.dayStart(NR.G);
      NR.startDay();
      NR.pauseClock(true);
      for (const m of NR.G.mail) if (m.actions && !m.done) {
        const want = { nadia_in: route === 'witness', promo_yes: route === 'kingpin', send: route === 'witness' };
        const a = m.actions.find((x) => want[x.id]) || m.actions[m.actions.length - 1];
        m.done = true; NR.story.mailAction(m, a.id);
      }
      if (route === 'witness' && NR.G.flags.nadiaIn) {
        // Grab files as they unlock (bypassing the random walk-by).
        for (const [id, day] of [['ledger', 3], ['bribes', 5], ['offshore', 7]]) {
          NR.G.flags.files = NR.G.flags.files || {};
          if (d >= day && !NR.G.flags.files[id]) { NR.G.flags.files[id] = true; NR.G.evidence++; }
        }
        if (d === 10) { const m = NR.G.mail.find((x) => x.subj === 'tonight'); if (m) NR.story.mailAction(m, 'send'); }
      }
      // Story leads first.
      NR.G.leads.sort((a, b) => (b.story ? 1 : 0) - (a.story ? 1 : 0));
      let calls = 0;
      while (NR.G.minute < 470 && calls < 9) {
        const lead = NR.G.leads[0];
        const scams = NR.unlockedScams().filter((s) => !NR.SCAMS[s].elderlyOnly || lead.age >= 65);
        const r = NR.dial(lead.id, lead.story && lead.story.scam || scams[Math.floor(Math.random() * scams.length)]);
        calls++;
        if (r && r.call) { bot(r.call); await new Promise((ok) => setTimeout(ok, 0)); }
        NR.advance(50);
        if (NR.G.heat >= 100 && !ending) { NR.raidResult(true); log.push('raid d' + d); }
      }
      await new Promise((ok) => setTimeout(ok, 0));
      let review = null;
      NR.on('dayEnd', (r) => { review = r; });
      NR.forceEndDay();
      if (!review) review = NR.G.lastReview;
      log.push(`d${review.day}: ${review.gross}/${review.quota} ${review.grade}${review.fired ? ' FIRED' : ''} heat ${Math.round(NR.G.heat)}`);
      const e = NR.story.ending(NR.G, review);
      if (e) { ending = e; break; }
      // Shop a little.
      for (const u of NR.UPGRADES) NR.buyUpgrade(u.id);
    }
    return { ending, log, flags: NR.G.flags, news: NR.G.news.map((n) => n.head), conscience: Math.round(NR.G.conscience), victims: NR.G.victims.length };
  }, route);
  console.log(JSON.stringify(res, null, 1));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
