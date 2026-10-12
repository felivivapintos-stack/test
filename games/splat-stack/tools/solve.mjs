// Proves every level can be finished and finds the fewest deaths needed (the par).
// Best-first search over the real simulation, one layer per death count, so the
// first solution found uses the fewest deaths the search can reach.
// Usage: node tools/solve.mjs [levelNumber...]
import { parseLevel, createState, cloneState, step, doorPos, TILE } from '../src/sim.js';
import { LEVELS } from '../src/levels.js';

const STEP = 5;
const ACTIONS = [];
for (const dir of [-1, 0, 1]) for (const j of [false, true]) ACTIONS.push({ l: dir < 0, r: dir > 0, j });
const IDLE = { l: false, r: false, j: false };

function trapKey(S) {
  let k = S.crumble.map((c) => (c === 0 ? 1 : 0)).join('') + S.pop.join('') + (S.doorMoved ? 'm' : '');
  for (const d of S.drop) k += d.s;
  return k;
}
function splatKey(S, q) {
  return S.splats.map((s) => `${Math.round(s.x / q)},${Math.round(s.y / q)}`).sort().join(';');
}
function key(L, S) {
  const p = S.p;
  const t = L.saws.length ? (S.t % L.sawCycle) / STEP | 0 : 0;
  return `${p.x >> 4},${p.y >> 3},${Math.round(p.vx / 2)},${Math.round(p.vy / 4)},${p.ground ? 1 : 0},${t}|${trapKey(S)}|${splatKey(S, 8)}`;
}
function heuristic(L, S) {
  const d = doorPos(L, S);
  return Math.abs(S.p.x - d.x) + Math.abs(S.p.y - d.y) * 1.5;
}

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v, pri) {
    const a = this.a; a.push([pri, v]);
    let i = a.length - 1;
    while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top[1];
  }
}

export function solve(def, { maxDeaths = 6, layerNodes = 2_000_000, maxConfigs = 150 } = {}) {
  const L = parseLevel(def);
  let layer = [createState(L)];
  let nodes = 0;
  const visited = new Set();
  for (let deaths = 0; deaths <= maxDeaths; deaths++) {
    const next = new Map();
    const heap = new Heap();
    for (const S of layer) heap.push(S, heuristic(L, S));
    let budget = layerNodes;
    while (heap.size && budget > 0) {
      const S = heap.pop();
      for (const a of ACTIONS) {
        budget--; nodes++;
        const N = cloneState(S);
        let died = false;
        for (let f = 0; f < STEP; f++) {
          step(L, N, a);
          if (N.won) return { solved: true, deaths, nodes };
          if (N.p.dead) { died = true; break; }
        }
        if (died) {
          while (N.p.dead) step(L, N, IDLE);
          const k = splatKey(N, 16) + '|' + (L.saws.length ? Math.floor((N.t % L.sawCycle) / 30) : 0) + (N.doorMoved ? 'm' : '');
          if (!next.has(k) && next.size < maxConfigs) next.set(k, N);
          continue;
        }
        const k = key(L, N);
        if (visited.has(k)) continue;
        visited.add(k);
        heap.push(N, heuristic(L, N));
      }
    }
    layer = [...next.values()];
    if (!layer.length) return { solved: false, nodes, reason: 'no more states', deaths };
  }
  return { solved: false, nodes, reason: 'death limit', deaths: maxDeaths };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const only = process.argv.slice(2).map(Number);
  let failed = 0;
  LEVELS.forEach((def, i) => {
    if (only.length && !only.includes(i + 1)) return;
    const t0 = Date.now();
    const r = solve(def);
    const ms = Date.now() - t0;
    const parOk = r.solved && r.deaths <= def.par;
    if (!r.solved || !parOk) failed++;
    const status = !r.solved ? `UNSOLVED (${r.reason})` : !parOk ? `PAR TOO LOW (needs ${r.deaths})` : r.deaths < def.par ? `ok, par could be ${r.deaths}` : 'ok';
    console.log(`${String(i + 1).padStart(2)} ${def.name.padEnd(22)} par ${def.par}  min ${r.solved ? r.deaths : '-'}  ${status}  ${r.nodes} nodes ${ms}ms`);
  });
  if (failed) { console.error(`${failed} level(s) failed`); process.exit(1); }
}
