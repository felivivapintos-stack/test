// Online multiplayer test: three isolated browsers join by room code through
// the public PeerJS server, play a full lap and talk over (fake) microphones.
// Usage: NODE_PATH=$(npm root -g) node tools/mp-test.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, arg, ms = 20000) {
  try { return await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); } catch (e) {
    const st = await page.evaluate(() => { const { S, net } = NR.mp(); return S && { phase: S.phase, round: S.round, me: net.me && net.me.slice(0, 6), cur: S.cur && { caller: S.cur.callerId.slice(0, 6), victim: S.cur.victimId.slice(0, 6) }, snap: !!S.snap, modal: !document.querySelector('#overlay').hidden && document.querySelector('#overlay').innerText.slice(0, 80) }; });
    throw new Error('waitFor failed: ' + fn.toString().slice(0, 120) + ' state=' + JSON.stringify(st));
  }
}
const clickText = (page, text) => page.evaluate((t) => {
  const ov = document.querySelector('#overlay');
  const find = (root) => [...root.querySelectorAll('button')].filter((x) => !x.disabled && x.offsetParent !== null && x.textContent.includes(t)).pop();
  const b = (!ov.hidden && find(ov)) || find(document);
  if (b) b.click();
  return !!b;
}, text);
const dismissModal = (page) => page.evaluate(() => { const ov = document.querySelector('#overlay'); if (!ov.hidden) { const b = ov.querySelector('button:last-of-type'); if (b && b.textContent.includes('go')) b.click(); } });

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const names = ['Ana', 'Bruno', 'Carla'];
  const pages = [];
  const errors = [];
  for (const n of names) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['microphone'] });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${n}: ${e.message}`));
    await p.goto(url);
    await p.evaluate(() => { NR.settings.sound = false; });
    pages.push(p);
  }
  const [host, ...clients] = pages;
  // Host creates the room.
  await clickText(host, 'host a game');
  await host.fill('#mp-name', 'Ana');
  await clickText(host, 'Create room');
  await waitFor(host, () => NR.mp().S && NR.mp().S.code);
  const code = await host.evaluate(() => NR.mp().S.code);
  console.log('room', code);
  // Clients join by code.
  for (const [i, c] of clients.entries()) {
    await clickText(c, 'Join a game');
    await c.fill('#mp-name', names[i + 1]);
    await c.fill('#mp-code', code);
    await clickText(c, 'Join');
  }
  await waitFor(host, () => NR.mp().S.players.length === 3);
  for (const p of pages) await waitFor(p, () => NR.mp().S && NR.mp().S.players.length === 3);
  console.log('lobby ok');
  await host.screenshot({ path: `${out}/m-lobby.png` });
  for (const p of pages) await clickText(p, 'Join voice chat');
  await sleep(4000);
  const voice = await Promise.all(pages.map((p) => p.evaluate(() => NR.voice.count())));
  console.log('voice links per player', voice);
  await clickText(host, 'Start game');

  const role = async (p) => p.evaluate(() => { const { S, net } = NR.mp(); const c = S.cur; return !c ? null : c.callerId === net.me ? 'caller' : c.victimId === net.me ? 'victim' : 'spec'; });
  const results = [];
  for (let round = 0; round < 3; round++) {
    for (const p of pages) { await waitFor(p, (r) => NR.mp().S.phase === 'pre' && NR.mp().S.round === r, round); await dismissModal(p); }
    const roles = await Promise.all(pages.map(role));
    const caller = pages[roles.indexOf('caller')], victim = pages[roles.indexOf('victim')], spec = pages[roles.indexOf('spec')];
    await clickText(spec, '😈 Baiter'); await clickText(spec, '💰 Pays');
    await waitFor(host, () => Object.values(NR.mp().S.cur.preds).some((p) => p.role));
    await clickText(caller, '📞 Call');
    await waitFor(victim, () => NR.mp().S.snap && NR.mp().S.phase === 'call');
    if (round === 0) { await victim.screenshot({ path: `${out}/m-victim.png` }); await spec.screenshot({ path: `${out}/m-spec.png` }); }
    // Victim fights back, spectator throws chaos, caller plays cards.
    await victim.evaluate(() => document.querySelector('.ptoken:not([disabled])').click());
    await spec.evaluate(() => document.querySelector('.pchaos:not([disabled])').click());
    await waitFor(caller, () => NR.call && NR.call.log.some((m) => m.text.includes('plays')) && NR.call.log.some((m) => m.text.includes('thrown by')));
    for (let i = 0; i < 2; i++) await caller.evaluate(() => document.querySelector('.hand .card') && document.querySelector('.hand .card').click());
    await waitFor(spec, () => NR.mp().S.snap && NR.mp().S.snap.turns >= 2);
    if (round === 0) await caller.screenshot({ path: `${out}/m-caller.png` });
    if (round === 0) {
      // Drive to payment; the victim reads the codes from their own screen.
      await caller.evaluate(() => { const c = NR.call; c.trust = 100; c.susp = 0; c.stage = c.scam.stages.length - 1; while (c.state === 'talk') c.ask(); document.querySelector('.ask-btn'); NR.emit('callChanged', c); });
      await waitFor(victim, () => NR.mp().S.snap.state === 'reading');
      const codes = await victim.evaluate(() => NR.mpData(NR.mp().S.cur.vcode).cards.map((c) => c.code));
      for (const cc of codes) await caller.evaluate((x) => NR.redeem(x, 'gift'), cc);
      await caller.evaluate(() => NR.call && NR.call.finishPayment());
    } else if (round === 1) {
      await caller.evaluate(() => { NR.mp().mine.deadline = Date.now(); });
      await waitFor(caller, () => NR.mp().mine.call.state === 'done');
    } else {
      await clickText(caller, 'Baiter!');
    }
    await waitFor(caller, () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('End round')));
    await clickText(caller, 'End round');
    for (const [i, p] of pages.entries()) if (roles[i] !== 'victim') { await waitFor(p, () => NR.mp().S.phase === 'vote'); await clickText(p, 'Yes!'); }
    await waitFor(host, () => NR.mp().S.phase === 'results');
    for (const p of pages) await waitFor(p, () => NR.mp().S.phase === 'results');
    const lines = await host.evaluate(() => NR.mp().S.cur.lines);
    results.push({ round, roles, lines });
    for (const p of pages) await p.evaluate(() => document.querySelectorAll('.virus-pop').forEach((x) => x.remove()));
    await clickText(host, round === 2 ? 'Final results' : 'Next round');
  }
  for (const p of pages) await waitFor(p, () => NR.mp().S.phase === 'final');
  await clients[0].screenshot({ path: `${out}/m-final.png` });
  const finals = await Promise.all(pages.map((p) => p.evaluate(() => ({ scores: NR.mp().S.scores, awards: (NR.mp().S.awards || []).map((a) => a[1] + ':' + a[2]) }))));
  for (const r of results) console.log(`R${r.round} [${r.roles.join(',')}]\n   ` + r.lines.join('\n   '));
  console.log('AWARDS', JSON.stringify(finals[0].awards));
  console.log('SCORES agree on all devices:', finals.every((f) => JSON.stringify(f.scores) === JSON.stringify(finals[0].scores)));
  // A player leaving mid-game: close Carla's page and check the host notices.
  await pages[2].close();
  await waitFor(host, () => NR.mp().S.players.length === 2, null, 15000).then(() => console.log('leave detected')).catch(() => console.log('leave NOT detected'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})().catch((e) => { console.log('FAIL', e.message); process.exit(1); });
