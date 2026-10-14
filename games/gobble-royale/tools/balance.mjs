// Plays many rounds headless and prints how they go, so balance changes can be checked.
// The player is driven by the bot brain at a chosen skill (0 = idle, 1 = shark).
// Usage: node tools/balance.mjs [rounds=40]
import { createGame, step, rollPerks, choosePerk, autopilot, leaderboard, ROUND_TIME } from '../src/sim.js';

const rounds = +(process.argv[2] || 40);
let fail = 0;

function run(seed, skill, difficulty) {
  const S = createGame({ seed, difficulty });
  const marks = {};
  let steps = 0, maxFood = 0;
  while (!S.over) {
    const input = skill === 0 ? { x: 0, y: 0 } : autopilot(S, S.player, skill);
    step(S, input);
    while (S.player.pendingLevels > 0) choosePerk(S, rollPerks(S)[0].id);
    S.events.length = 0;
    steps++;
    maxFood = Math.max(maxFood, S.food.length);
    for (const t of [30, 60, 120]) if (!marks[t] && S.t >= t) marks[t] = Math.round(S.player.mass);
    for (const b of S.blobs) if (!Number.isFinite(b.x) || !Number.isFinite(b.mass)) { console.error('NaN', seed, b); fail++; return null; }
    if (steps > ROUND_TIME * 60 + 10) { console.error('round did not end', seed); fail++; return null; }
  }
  const lb = leaderboard(S);
  return { ...S.result, marks, maxFood, aliveEnd: S.aliveCount, top: lb[0] ? Math.round(lb[0].mass) : 0 };
}

for (const [skill, diff] of (process.env.CASES ? JSON.parse(process.env.CASES) : [[0, 1], [0.4, 0], [0.4, 1], [0.7, 0], [0.7, 1], [1, 1]])) {
  const res = [];
  for (let i = 0; i < rounds; i++) { const r = run(1000 + i, skill, diff); if (r) res.push(r); }
  const avg = (f) => (res.reduce((a, r) => a + f(r), 0) / res.length).toFixed(1);
  const wins = res.filter((r) => r.placement === 1).length;
  const survived = res.filter((r) => r.alive).length;
  const top3 = res.filter((r) => r.placement <= 3).length;
  console.log(`skill ${skill} diff ${diff}: win ${wins}/${res.length}  top3 ${top3}  survived ${survived}  placement ${avg((r) => r.placement)}  ` +
    `peak ${avg((r) => r.peak)}  kills ${avg((r) => r.kills)}  level ${avg((r) => r.level)}  time ${avg((r) => r.time)}s  ` +
    `mass@30/60/120 ${avg((r) => r.marks[30] || 0)}/${avg((r) => r.marks[60] || 0)}/${avg((r) => r.marks[120] || 0)}  ` +
    `aliveEnd ${avg((r) => r.aliveEnd)}  topMass ${avg((r) => r.top)}  food ${Math.max(...res.map((r) => r.maxFood))}`);
}
if (fail) { console.error(`${fail} failures`); process.exit(1); }
