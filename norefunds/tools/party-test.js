// Two-device party test: a host page and a victim phone page share only a code.
// Covers predictions, victim tokens, chaos cards, both timers, awards and resume.
// Usage: NODE_PATH=$(npm root -g) node tools/party-test.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const click = (page, text) => page.locator(`button:has-text("${text}")`).first().evaluate((b) => b.click());

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const host = await ctx.newPage();
  await host.setViewportSize({ width: 1280, height: 800 });
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  for (const [n, p] of [['host', host], ['phone', phone]]) p.on('pageerror', (e) => errors.push(n + ': ' + e.message));
  await host.goto(url);
  await host.evaluate(() => { NR.settings.voice = false; NR.settings.sound = false; });
  await click(host, 'Party: Scammers vs Baiters');
  await host.fill('#party-names', 'Ana\nBruno\nCarla\nDani');
  await click(host, 'Start party');
  const results = [];
  const rounds = 4;
  for (let round = 0; round < rounds; round++) {
    if (round === 2) {
      // Reload mid-party: the title screen must offer to resume.
      await host.reload();
      await host.evaluate(() => { NR.settings.voice = false; NR.settings.sound = false; });
      await click(host, 'Resume party');
    }
    const code = await host.evaluate(() => NR.party().cur.code);
    if (round === 0) await host.screenshot({ path: `${out}/q0-code.png` });
    await click(host, 'Victim is ready');
    await phone.goto(url + '?r=' + round + '#victim');
    await phone.fill('#victim-code', code);
    await click(phone, 'Get my character');
    const phoneCards = await phone.$$eval('.gcard b', (b) => b.map((x) => x.textContent));
    const role = await phone.textContent('.role');
    if (round === 0) await phone.screenshot({ path: `${out}/q0-phone.png`, fullPage: true });
    // Spectators predict.
    await host.evaluate(() => document.querySelectorAll('.preds tr').forEach((tr, i) => { tr.querySelectorAll('button')[i % 2].click(); tr.querySelectorAll('button')[2].click(); }));
    if (round === 0) await host.screenshot({ path: `${out}/q0-preds.png` });
    await click(host, '📞 Call');
    // Play a few cards, then a victim token and a chaos card.
    for (let i = 0; i < 3; i++) await host.evaluate(() => document.querySelector('.hand .card') && document.querySelector('.hand .card').click());
    await host.evaluate(() => { const t = document.querySelector('.ptoken:not([disabled])'); t && t.click(); });
    await host.evaluate(() => { const t = document.querySelector('.pchaos:not([disabled])'); t && t.click(); });
    if (round === 0) await host.screenshot({ path: `${out}/q0-call.png` });
    if (round === 3) {
      // Round timer: force it to run out.
      await host.evaluate(() => { NR.party().cur.deadline = Date.now(); });
      await host.waitForTimeout(700);
    } else {
      // Drive the call to payment.
      await host.evaluate(() => { const c = NR.call; c.trust = 100; c.susp = 0; c.stage = c.scam.stages.length - 1; while (c.state === 'talk') c.ask(); });
      if (round === 1) {
        // Payment timer: the victim stalls until the cards freeze.
        await host.evaluate(() => { NR.party().cur.payDeadline = Date.now(); });
        await host.waitForTimeout(700);
      } else {
        for (const card of phoneCards) await host.evaluate((cc) => NR.redeem(cc, 'gift'), card);
        await host.evaluate(() => NR.call && NR.call.state === 'reading' && NR.call.finishPayment());
      }
    }
    await host.waitForTimeout(100);
    await host.evaluate(() => NR.refreshApp('phone'));
    await click(host, 'End round');
    await click(host, 'Yes!');
    const last = await host.evaluate(() => NR.party().history.slice(-1)[0]);
    results.push({ round, role, outcome: last.outcome, lines: last.lines });
    await host.evaluate(() => document.querySelectorAll('.virus-pop').forEach((p) => p.remove()));
    await click(host, round === rounds - 1 ? 'Final results' : 'Next round');
  }
  await host.screenshot({ path: `${out}/q-final.png` });
  const final = await host.evaluate(() => ({ scores: NR.party().scores, awards: [...document.querySelectorAll('.award b')].map((b) => b.textContent), saved: NR.hasSavedParty() }));
  for (const r of results) console.log(`R${r.round} ${r.role} → ${r.outcome}\n   ` + r.lines.join('\n   '));
  console.log('FINAL', JSON.stringify(final));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
