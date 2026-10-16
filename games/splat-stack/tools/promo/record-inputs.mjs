// Finds a solution for each level and writes the exact per-frame inputs,
// so the promo video replays real, deterministic gameplay.
// Usage: SOLVE_STEP=10 node tools/promo/record-inputs.mjs 1 7 22 > tools/promo/inputs.json
import { parseLevel, createState, cloneState, step, doorPos } from '../../src/sim.js';
import { LEVELS } from '../../src/levels.js';

const STEP = Number(process.env.SOLVE_STEP) || 10;
const ACTIONS = [];
for (const dir of [-1, 0, 1]) for (const j of [false, true]) ACTIONS.push({ l: dir < 0, r: dir > 0, j });
const IDLE = { l: false, r: false, j: false };
const enc = (a) => (a.l ? 'l' : '') + (a.r ? 'r' : '') + (a.j ? 'j' : '') || '-';

function key(L, S) {
  const p = S.p;
  const t = S.sawT.map((v, i) => ((v % L.saws[i].period) / STEP) | 0).join(':');
  const tr = S.crumble.map((c) => (c === 0 ? 1 : 0)).join('') + S.pop.join('') + (S.doorMoved ? 'm' : '') + S.drop.map((d) => d.s).join('');
  const sp = S.splats.map((s) => `${Math.round(s.x / 8)},${Math.round(s.y / 8)}`).sort().join(';');
  return `${p.x >> 4},${p.y >> 3},${Math.round(p.vx / 2)},${Math.round(p.vy / 4)},${p.ground ? 1 : 0},${t}|${tr}|${sp}`;
}
// Prefer short runs: cost is distance to the door plus time spent, so the replay looks purposeful.
const h = (L, S) => Math.abs(S.p.x - doorPos(L, S).x) + Math.abs(S.p.y - doorPos(L, S).y) * 1.5 + S.t * 1.2;

function solveFrames(def) {
  const L = parseLevel(def);
  let layer = [{ S: createState(L), frames: '' }];
  for (let deaths = 0; deaths <= def.par; deaths++) {
    const next = new Map(); const seen = new Set();
    const open = layer.slice();
    let budget = 3_000_000;
    while (open.length && budget > 0) {
      open.sort((a, b) => h(L, b.S) - h(L, a.S));
      const cur = open.pop();
      for (const a of ACTIONS) {
        budget--;
        const N = cloneState(cur.S); let fr = cur.frames; let died = false;
        for (let f = 0; f < STEP; f++) {
          step(L, N, a); fr += enc(a) + ' ';
          if (N.won) return fr.trim().split(' ');
          if (N.p.dead) { died = true; break; }
        }
        if (died) {
          while (N.p.dead) { step(L, N, IDLE); fr += '- '; }
          if (deaths < def.par) { const k = N.splats.map((s) => `${s.x >> 4},${s.y >> 4}`).sort().join(';'); if (!next.has(k)) next.set(k, { S: N, frames: fr }); }
          continue;
        }
        const k = key(L, N); if (seen.has(k)) continue; seen.add(k);
        open.push({ S: N, frames: fr });
      }
      if (open.length > 40000) { open.sort((a, b) => h(L, a.S) - h(L, b.S)); open.length = 20000; }
    }
    layer = [...next.values()].slice(0, 60);
  }
  throw new Error('no solution for ' + def.name);
}

const out = {};
for (const n of process.argv.slice(2).map(Number)) {
  const frames = solveFrames(LEVELS[n - 1]);
  out[n] = frames.join(' ');
  console.error(`level ${n}: ${frames.length} frames (${(frames.length / 60).toFixed(1)}s)`);
}
console.log(JSON.stringify(out));
