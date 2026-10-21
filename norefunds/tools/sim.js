// Balance simulator: plays many calls with a simple greedy bot.
// Usage: node tools/sim.js [calls]
global.window = global; global.document = undefined;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const path = require('path');
for (const f of ['util', 'data', 'engine', 'game']) {
  try { require(path.join(__dirname, '..', 'js', f + '.js')); } catch (e) { if (f !== 'game') throw e; }
}
const NR = global.NR;
const N = +process.argv[2] || 3000;
const stats = {};
let money = 0;
for (let i = 0; i < N; i++) {
  const scamIds = Object.keys(NR.SCAMS).filter((s) => !NR.SCAMS[s].elderlyOnly);
  const scam = NR.pick(scamIds);
  const v = NR.makeVictim({ baiterRate: 0 });
  const c = new NR.Call(v, scam, {});
  c.start();
  let guard = 0;
  while (c.state !== 'done' && guard++ < 60) {
    if (c.state === 'store') { c.storeArrive(); continue; }
    if (c.state === 'reading') { money += c.amount; c.finishPayment(); break; }
    if (c.state === 'talk' && c.askChance() >= 0.6) { c.ask(); continue; }
    // pick card with best expected value
    let best = 0, bv = -1e9;
    c.hand.forEach((id, i2) => {
      const t = NR.TACTICS[id], m = c.multiplierFor(id) * (c.last === (t.base || id) ? 0.5 : 1);
      const val = (t.trust || 0) * m - (t.susp || 0) * (c.susp > 50 ? 1.5 : 0.7) + (t.press || 0) * 0.3;
      if (val > bv) { bv = val; best = i2; }
    });
    c.play(best);
  }
  stats[c.outcome] = (stats[c.outcome] || 0) + 1;
}
console.log('calls', N, stats, 'avg $/call', Math.round(money / N));
