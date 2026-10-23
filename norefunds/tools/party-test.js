// Two-device party test: a host page and a victim phone page share only a code.
// Usage: NODE_PATH=$(npm root -g) node tools/party-test.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  for (const [n, p] of [['host', host], ['phone', phone]]) p.on('pageerror', (e) => errors.push(n + ': ' + e.message));
  await host.goto(url);
  await host.evaluate(() => { NR.settings.voice = false; NR.settings.sound = false; });
  await host.click('text=Party: Scammers vs Baiters');
  await host.fill('#party-names', 'Ana\nBruno\nCarla');
  await host.click('text=Start party');
  const results = [];
  for (let round = 0; round < 3; round++) {
    const code = await host.evaluate(() => NR.party().cur.code);
    await host.screenshot({ path: `${out}/p${round}-1-code.png` });
    await host.click('text=Victim is ready');
    // Victim phone: opens via #victim link and types the code.
    await phone.goto(url + '?r=' + round + '#victim');
    await phone.waitForTimeout(300);
    if (!(await phone.$('#victim-code'))) console.log('PHONE STATE', await phone.evaluate(() => [location.href, document.querySelector('#boot').hidden, document.querySelector('#boot').innerText.slice(0, 120)]));
    await phone.fill('#victim-code', code);
    await phone.click('text=Get my character');
    const phoneCards = await phone.$$eval('.gcard b', (b) => b.map((x) => x.textContent));
    const role = await phone.textContent('.role');
    if (round === 0) await phone.screenshot({ path: `${out}/p0-2-phone.png`, fullPage: true });
    // Host: call and play until payment or the call ends.
    await host.locator('button:has-text("📞 Call")').evaluate((b) => b.click());
    let guard = 0;
    while (guard++ < 60) {
      const st = await host.evaluate(() => NR.call ? { s: NR.call.state, p: NR.call.state === 'talk' ? NR.call.askChance() : 0 } : null);
      if (!st || st.s === 'done') break;
      if (st.s === 'reading') break;
      if (st.p >= 0.6) await host.evaluate(() => document.querySelector('.ask-btn').click());
      else await host.evaluate(() => document.querySelector('.hand .card').click());
      await host.waitForTimeout(20);
    }
    if (round === 0) await host.screenshot({ path: `${out}/p0-3-call.png` });
    const state = await host.evaluate(() => NR.call && NR.call.state);
    let redeemMsgs = [];
    if (state === 'reading') {
      // The victim reads the codes aloud; the caller types them into Redeem.
      await host.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Wrap up')); b && b.click(); });
      for (const code of phoneCards) redeemMsgs.push(await host.evaluate((c) => NR.redeem(c, 'gift').msg, code));
    }
    const endBtn = await host.$('button:has-text("End round")');
    if (!endBtn) { await host.screenshot({ path: `${out}/p-fail.png` }); console.log('NO END BUTTON', round, await host.evaluate(() => [NR.call && NR.call.state, NR.party().cur.call && NR.party().cur.call.outcome, NR.modalOpen()])); }
    await endBtn.evaluate((b) => b.click());
    await host.click('.modal button:has-text("Yes!")');
    if (round === 0) await host.screenshot({ path: `${out}/p0-4-results.png` });
    const pts = await host.evaluate(() => NR.party().history.slice(-1)[0]);
    results.push({ code, role, cards: phoneCards.length, state, redeem: redeemMsgs.map((m) => m.slice(0, 40)), notes: pts.notes });
    await host.click('.modal button.primary');
    await host.evaluate(() => document.querySelectorAll('.virus-pop').forEach((p) => p.remove()));
  }
  console.log(JSON.stringify(results, null, 1));
  console.log('scores', JSON.stringify(await host.evaluate(() => NR.party().scores)));
  await host.screenshot({ path: `${out}/p-final.png` });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
