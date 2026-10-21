// Headless smoke test: plays through a day in the real page and screenshots it.
// Usage: NODE_PATH=$(npm root -g) node tools/smoke.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.evaluate(() => { NR.settings.voice = false; NR.settings.sound = false; NR.settings.speed = 20; });
  await page.screenshot({ path: out + '/01-title.png' });
  await page.click('text=New Story');
  await page.click('text=Clock in');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/02-desktop.png' });
  let calls = 0, shots = 0;
  for (let step = 0; step < 900; step++) {
    const st = await page.evaluate(() => {
      const g = NR.G; const c = NR.call;
      if (NR.modalOpen()) return { modal: document.querySelector('.modal .titlebar').textContent };
      if (!c) return { idle: true, clocked: g.clockedIn, leads: g.leads.length };
      return { state: c.state, p: c.state === 'talk' ? c.askChance() : 0, hand: c.hand.length };
    });
    if (st.modal) {
      if (/End of Day/.test(st.modal)) { await page.screenshot({ path: out + '/05-review.png' }); }
      if (/Day 2/.test(st.modal) || /After hours/.test(st.modal)) break;
      await page.click('.modal button >> nth=-1');
      continue;
    }
    if (st.idle) {
      if (!st.clocked) break;
      await page.evaluate(() => NR.openApp('phone'));
      const b = await page.$('.leadcard button.primary');
      if (b) { await b.click(); calls++; }
      await page.waitForTimeout(50);
      continue;
    }
    if (st.state === 'talk' || st.state === 'cashier') {
      if (shots === 0 && calls >= 1) { await page.evaluate(() => NR.openApp('phone')); await page.screenshot({ path: out + '/03-call.png' }); shots++; }
      if (st.state === 'talk' && st.p >= 0.6) await page.evaluate(() => document.querySelector('.ask-btn').click());
      else await page.evaluate(() => { const cs = document.querySelectorAll('.hand .card'); if (cs.length) cs[Math.floor(Math.random() * cs.length)].click(); });
    } else if (st.state === 'reading') {
      // Type codes into the Redeem/Terminal app like a player would.
      await page.evaluate(() => {
        const c = NR.call;
        for (const code of c.payout.codes) if (!code.done) NR.redeem(code.spoken.replace(/\((\w) or (\w)\?\)/, '$1'), code.type);
      });
      if (shots === 1) { await page.screenshot({ path: out + '/04-redeem.png' }); shots++; }
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Wrap up')); b && b.click(); });
    }
    await page.waitForTimeout(40);
  }
  const g = await page.evaluate(() => ({ day: NR.G.day, gross: NR.G.gross, cash: NR.G.cash, stats: NR.G.stats, heat: NR.G.heat, news: NR.G.news.length }));
  console.log('calls', calls, JSON.stringify(g));
  // Visit every app once.
  for (const id of ['mail', 'shop', 'casino', 'news', 'ledger', 'settings', 'help', 'vault', 'redeem']) await page.evaluate((i) => NR.openApp(i), id);
  await page.screenshot({ path: out + '/06-apps.png' });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => NR.openApp('phone'));
  await page.screenshot({ path: out + '/07-mobile.png' });
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
