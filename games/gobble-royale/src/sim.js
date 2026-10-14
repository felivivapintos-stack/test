// Deterministic game simulation. No DOM: the balance tool (tools/balance.mjs) runs it in Node.
import { PERKS, BOT_NAMES } from './data.js';

export const ARENA = 3200;
export const ROUND_TIME = 180;
export const FRENZY_TIME = 30; // last seconds: gold rain
export const DT = 1 / 60;
const CELL = 100;
const GRID = Math.ceil(ARENA / CELL);
const CRUMBS = 1100;
const CRITTERS = 70;
const GOLDS = 3;
const SPIKES = [40, 40, 40, 40, 40, 100, 100, 100, 100, 250, 250, 250, 250, 600];
const BASE_EAT = 1.25;
const BOT_COLORS = ['#ff6b8b', '#ffb84d', '#5ad1ff', '#b48cff', '#ff8f5a', '#4de3a5', '#ffd84d', '#ff7ad9', '#7d9bff', '#9be15d', '#ff5a5a', '#5af0e0'];

export const radius = (mass) => 4.5 * Math.sqrt(mass);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function xpNeed(level) { return Math.round(12 * Math.pow(1.42, level)); }

function makeBlob(S, { name, color, skin, isPlayer, mass, skill }) {
  const a = S.rand() * Math.PI * 2, d = 300 + S.rand() * (ARENA / 2 - 450);
  return {
    id: S.nextId++, name, color, skin, isPlayer, skill,
    x: ARENA / 2 + Math.cos(a) * d, y: ARENA / 2 + Math.sin(a) * d,
    vx: 0, vy: 0, dirX: Math.cos(a + Math.PI), dirY: Math.sin(a + Math.PI),
    mass, peak: mass, r: radius(mass), alive: true, placement: 0,
    dashCd: 0, dashT: 0, spikeT: 0, spawnT: 3,
    combo: 0, comboT: 0, kills: 0, eaten: 0, xp: 0, level: 0, pendingLevels: 0,
    perks: {}, killer: null, gold: 0,
    ai: { t: 0, tx: 0, ty: 0, dash: false, wanderA: a },
  };
}

export function perkLevel(b, id) { return b.perks[id] || 0; }

export function eatRatio(b) { return Math.max(1.1, BASE_EAT - 0.04 * perkLevel(b, 'jaws')); }

export function blobSpeed(b) {
  return 270 * Math.pow(b.mass, -0.17) * (1 + 0.1 * perkLevel(b, 'speed'));
}

function dashCooldown(b, S) {
  return 2.6 * Math.pow(0.78, perkLevel(b, 'dash')) * (b.isPlayer ? S.meta.dashMul : 1);
}

function magnetRange(b) { return b.r * 0.6 + 26 * perkLevel(b, 'magnet') + 10; }

function comboWindow(b) { return 1.3 + 0.45 * perkLevel(b, 'combo'); }

export function canEat(a, b) { return a.mass >= b.mass * eatRatio(a); }

function spawnFood(S, kind, x, y, mass) {
  if (x === undefined) {
    if (kind === 'crumb' && S.rand() < 0.55 && S.patches.length) {
      const p = S.patches[Math.floor(S.rand() * S.patches.length)];
      const a = S.rand() * Math.PI * 2, d = Math.sqrt(S.rand()) * p.r;
      x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
    } else {
      x = 40 + S.rand() * (ARENA - 80); y = 40 + S.rand() * (ARENA - 80);
    }
  }
  if (mass === undefined) {
    if (kind === 'crumb') mass = 1 + (S.rand() < 0.15 ? 1 : 0);
    else if (kind === 'critter') mass = 3 + Math.floor(Math.pow(S.rand(), 2.5) * 36);
    else if (kind === 'gold') mass = 22;
    else mass = 1;
  }
  const f = {
    id: S.nextId++, kind, x: clampA(x), y: clampA(y), vx: 0, vy: 0, mass,
    r: kind === 'crumb' ? 4 + mass * 1.5 : kind === 'bit' ? Math.min(14, 4 + Math.sqrt(mass) * 1.6) : radius(mass) * 0.85,
    hue: Math.floor(S.rand() * 6), a: S.rand() * Math.PI * 2, t: S.rand() * 10, dead: false, age: 0,
  };
  S.food.push(f);
  return f;
}

function clampA(v) { return Math.max(20, Math.min(ARENA - 20, v)); }

function spawnSpike(S, mass) {
  for (let tries = 0; tries < 30; tries++) {
    const x = 150 + S.rand() * (ARENA - 300), y = 150 + S.rand() * (ARENA - 300);
    let ok = true;
    for (const s of S.spikes) if (Math.hypot(s.x - x, s.y - y) < 260) { ok = false; break; }
    for (const b of S.blobs) if (b.alive && Math.hypot(b.x - x, b.y - y) < b.r + 120) { ok = false; break; }
    if (ok || tries === 29) {
      S.spikes.push({ id: S.nextId++, x, y, mass, r: radius(mass) * 0.9, dead: false, respawn: 0, rot: S.rand() * 6 });
      return;
    }
  }
}

export function createGame({ seed = 1, playerName = 'You', skin = 'lime', color = '#7dff6b', meta = {}, bots = 11, difficulty = 1 } = {}) {
  const S = {
    rand: rng(seed), t: 0, nextId: 1, over: false, result: null,
    blobs: [], food: [], spikes: [], events: [], patches: [],
    grid: Array.from({ length: GRID * GRID }, () => []),
    meta: { startMass: 10, dashMul: 1, ...meta },
    aliveCount: 0, frenzy: false, foodTimer: 0, difficulty,
  };
  for (let i = 0; i < 9; i++) {
    S.patches.push({ x: 300 + S.rand() * (ARENA - 600), y: 300 + S.rand() * (ARENA - 600), r: 120 + S.rand() * 160 });
  }
  S.player = makeBlob(S, { name: playerName, color, skin, isPlayer: true, mass: S.meta.startMass, skill: 1 });
  S.player.x = ARENA / 2; S.player.y = ARENA / 2;
  S.blobs.push(S.player);
  const names = BOT_NAMES.slice();
  for (let i = 0; i < bots; i++) {
    const n = names.splice(Math.floor(S.rand() * names.length), 1)[0];
    // Skill spread: a couple of sharks, most are average, a few are snacks.
    let skill = i < 2 ? 0.85 + S.rand() * 0.15 : i < 8 ? 0.45 + S.rand() * 0.35 : 0.15 + S.rand() * 0.25;
    skill *= 0.5 + 0.5 * difficulty;
    const b = makeBlob(S, { name: n, color: BOT_COLORS[i % BOT_COLORS.length], skin: 'bot' + (i % 6), isPlayer: false, mass: 9.5 + S.rand() * 1.5, skill });
    S.blobs.push(b);
  }
  // Keep bots from spawning on top of the player.
  for (const b of S.blobs) {
    if (b.isPlayer) continue;
    while (Math.hypot(b.x - S.player.x, b.y - S.player.y) < 420) {
      const a = S.rand() * Math.PI * 2, d = 500 + S.rand() * 900;
      b.x = clampA(ARENA / 2 + Math.cos(a) * d); b.y = clampA(ARENA / 2 + Math.sin(a) * d);
    }
  }
  for (let i = 0; i < CRUMBS; i++) spawnFood(S, 'crumb');
  for (let i = 0; i < CRITTERS; i++) spawnFood(S, 'critter');
  for (let i = 0; i < GOLDS; i++) spawnFood(S, 'gold');
  for (const m of SPIKES) spawnSpike(S, m);
  S.aliveCount = S.blobs.length;
  return S;
}

function rebuildGrid(S) {
  for (const c of S.grid) c.length = 0;
  for (const f of S.food) {
    if (f.dead) continue;
    const cx = Math.min(GRID - 1, Math.max(0, Math.floor(f.x / CELL)));
    const cy = Math.min(GRID - 1, Math.max(0, Math.floor(f.y / CELL)));
    S.grid[cy * GRID + cx].push(f);
  }
}

export function queryFood(S, x, y, r, out = []) {
  out.length = 0;
  const x0 = Math.max(0, Math.floor((x - r) / CELL)), x1 = Math.min(GRID - 1, Math.floor((x + r) / CELL));
  const y0 = Math.max(0, Math.floor((y - r) / CELL)), y1 = Math.min(GRID - 1, Math.floor((y + r) / CELL));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const c = S.grid[cy * GRID + cx];
    for (let i = 0; i < c.length; i++) out.push(c[i]);
  }
  return out;
}

function addMass(S, b, m, src) {
  let gain = m;
  if (src === 'food') gain *= 1 + 0.15 * perkLevel(b, 'glutton');
  if (src === 'blob') gain *= 1 + 0.2 * perkLevel(b, 'hunter');
  if (src === 'gold') gain *= 1 + 0.5 * perkLevel(b, 'goldnose');
  if (src !== 'bit') {
    b.combo = b.comboT > 0 ? b.combo + 1 : 1;
    b.comboT = comboWindow(b);
    gain *= 1 + Math.min(0.5, (b.combo - 1) * 0.03);
  }
  b.mass += gain;
  b.xp += gain;
  b.eaten += gain;
  if (b.mass > b.peak) b.peak = b.mass;
  while (b.xp >= xpNeed(b.level + 1)) {
    b.xp -= xpNeed(b.level + 1);
    b.level++;
    if (b.isPlayer) { b.pendingLevels++; S.events.push({ type: 'levelup', level: b.level }); }
    else botPickPerk(S, b);
  }
  return gain;
}

function botPickPerk(S, b) {
  const opts = PERKS.filter((p) => perkLevel(b, p.id) < p.max);
  if (!opts.length) return;
  const p = opts[Math.floor(S.rand() * opts.length)];
  b.perks[p.id] = perkLevel(b, p.id) + 1;
}

// Three distinct perk options for the player, weighted away from maxed ones.
export function rollPerks(S) {
  const b = S.player;
  const opts = PERKS.filter((p) => perkLevel(b, p.id) < p.max);
  const out = [];
  while (out.length < 3 && opts.length) out.push(opts.splice(Math.floor(S.rand() * opts.length), 1)[0]);
  return out;
}

export function choosePerk(S, id) {
  const b = S.player;
  if (b.pendingLevels <= 0) return;
  b.pendingLevels--;
  b.perks[id] = perkLevel(b, id) + 1;
  if (id === 'chonk') addMassRaw(b, Math.max(8, b.mass * 0.15));
}

function addMassRaw(b, m) { b.mass += m; if (b.mass > b.peak) b.peak = b.mass; }

function loseMass(S, b, frac, x, y, vx, vy) {
  const lost = b.mass * frac * Math.pow(0.6, perkLevel(b, 'skin'));
  b.mass = Math.max(8, b.mass - lost);
  // Spray what you lose as bits for everyone else to snack on.
  const n = Math.min(14, Math.max(3, Math.floor(lost / 6)));
  for (let i = 0; i < n; i++) {
    const a = S.rand() * Math.PI * 2, sp = 140 + S.rand() * 220;
    const f = spawnFood(S, 'bit', x, y, lost / n);
    f.vx = Math.cos(a) * sp + (vx || 0) * 0.3; f.vy = Math.sin(a) * sp + (vy || 0) * 0.3;
    f.color = b.color;
  }
  return lost;
}

function kill(S, eater, victim) {
  victim.alive = false;
  victim.killer = eater.name;
  victim.placement = S.aliveCount;
  S.aliveCount--;
  eater.kills++;
  const gain = addMass(S, eater, victim.mass * 0.8, 'blob');
  if (eater.isPlayer) eater.gold += 3 + Math.round(victim.mass / 25);
  S.events.push({ type: 'kill', eater: eater.id, victim: victim.id, x: victim.x, y: victim.y, mass: victim.mass, gain, color: victim.color, name: victim.name });
  if (victim.isPlayer) S.events.push({ type: 'playerDead', by: eater.name });
}

// ---------- AI ----------
const tmp = [];
function think(S, b) {
  const ai = b.ai;
  const view = 260 + b.r * 5;
  let fx = 0, fy = 0, threat = 0;
  let best = null, bestScore = 0;
  ai.dash = false;
  for (const o of S.blobs) {
    if (o === b || !o.alive) continue;
    const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d > view + o.r) continue;
    if (canEat(o, b) && o.spawnT <= 0) {
      // Flee: stronger the closer it is. Low-skill bots notice danger later.
      const reach = o.r + b.r + 140 + 260 * b.skill;
      if (d < reach) {
        const w = (reach - d) / reach;
        fx -= (dx / d) * w * 3; fy -= (dy / d) * w * 3; threat = Math.max(threat, w);
        if (d < o.r + b.r + 60 && S.rand() < b.skill) ai.dash = true;
      }
    } else if (canEat(b, o) && o.spawnT <= 0) {
      // On easy rounds bots would rather hunt each other than the player.
      const score = (o.mass * (0.6 + b.skill)) / (d + 80) * (o.isPlayer ? 0.35 + 0.75 * S.difficulty : 1);
      if (score > bestScore) { bestScore = score; best = o; }
    }
  }
  for (const s of S.spikes) {
    if (s.dead) continue;
    const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (spikeHurts(b, s) && d < s.r + b.r + 90 * b.skill) {
      const w = 1 - d / (s.r + b.r + 90);
      fx -= (dx / d) * w * 2; fy -= (dy / d) * w * 2;
    } else if (b.mass >= s.mass * 1.4) {
      const score = s.mass / (d + 80);
      if (score > bestScore) { bestScore = score; best = s; }
    }
  }
  queryFood(S, b.x, b.y, Math.min(view, 520), tmp);
  for (const f of tmp) {
    if (f.dead || f.r > b.r * 0.9) continue;
    const d = Math.hypot(f.x - b.x, f.y - b.y);
    const score = (f.mass * (f.kind === 'gold' ? 2 : 1)) / (d + 60) * (0.7 + 0.3 * b.skill);
    if (score > bestScore) { bestScore = score; best = f; }
  }
  let tx, ty;
  if (best) {
    const lead = best.vx !== undefined ? 0.25 * b.skill : 0;
    tx = best.x + (best.vx || 0) * lead - b.x; ty = best.y + (best.vy || 0) * lead - b.y;
    const d = Math.hypot(tx, ty) || 1;
    tx /= d; ty /= d;
    if (best.alive !== undefined && d < b.r * 3 + 120 && S.rand() < b.skill * (best.isPlayer ? 0.3 + 0.5 * S.difficulty : 0.8) && threat < 0.2) ai.dash = true;
  } else {
    ai.wanderA += (S.rand() - 0.5) * 1.2;
    tx = Math.cos(ai.wanderA); ty = Math.sin(ai.wanderA);
  }
  // Danger outweighs hunger; tug toward the middle when near the walls.
  const wTarget = threat > 0 ? Math.max(0.2, 1 - threat * 1.5) : 1;
  let mx = tx * wTarget + fx, my = ty * wTarget + fy;
  const edge = 220;
  if (b.x < edge) mx += (edge - b.x) / edge * 2;
  if (b.x > ARENA - edge) mx -= (b.x - (ARENA - edge)) / edge * 2;
  if (b.y < edge) my += (edge - b.y) / edge * 2;
  if (b.y > ARENA - edge) my -= (b.y - (ARENA - edge)) / edge * 2;
  const m = Math.hypot(mx, my) || 1;
  ai.tx = mx / m; ai.ty = my / m;
  ai.t = 0.12 + (1 - b.skill) * 0.35 + S.rand() * 0.1;
}

function spikeHurts(b, s) { return b.mass > 16 && b.mass < s.mass * 1.4; }

// ---------- Step ----------
export function step(S, input) {
  // spectate: keep the arena alive behind the death screen.
  if (S.over && !(S.spectate && S.t < ROUND_TIME)) return;
  const dt = DT;
  S.t += dt;
  const timeLeft = ROUND_TIME - S.t;
  if (!S.frenzy && timeLeft <= FRENZY_TIME) { S.frenzy = true; S.events.push({ type: 'frenzy' }); }

  rebuildGrid(S);

  // Steering
  for (const b of S.blobs) {
    if (!b.alive) continue;
    let ix = 0, iy = 0, dash = false;
    if (b.isPlayer) {
      ix = input.x || 0; iy = input.y || 0; dash = !!input.dash;
    } else {
      b.ai.t -= dt;
      if (b.ai.t <= 0) think(S, b);
      ix = b.ai.tx; iy = b.ai.ty; dash = b.ai.dash;
    }
    const mag = Math.min(1, Math.hypot(ix, iy));
    if (mag > 0.05) { b.dirX = ix / Math.hypot(ix, iy); b.dirY = iy / Math.hypot(ix, iy); }
    const sp = blobSpeed(b) * mag;
    b.dashCd = Math.max(0, b.dashCd - dt);
    b.spikeT = Math.max(0, b.spikeT - dt);
    b.spawnT = Math.max(0, b.spawnT - dt);
    if (dash && b.dashCd <= 0 && b.mass >= 14) {
      b.dashCd = dashCooldown(b, S);
      b.dashT = 0.24;
      const cost = b.mass * 0.03 * Math.pow(0.6, perkLevel(b, 'skin'));
      b.mass -= cost;
      const f = spawnFood(S, 'bit', b.x - b.dirX * b.r, b.y - b.dirY * b.r, cost);
      f.vx = -b.dirX * 120; f.vy = -b.dirY * 120; f.color = b.color; f.owner = b.id; f.ownerT = 0.6;
      S.events.push({ type: 'dash', id: b.id, x: b.x, y: b.y });
      b.vx = b.dirX * blobSpeed(b) * 2.8; b.vy = b.dirY * blobSpeed(b) * 2.8;
    }
    if (b.dashT > 0) {
      b.dashT -= dt;
    } else {
      const k = Math.min(1, dt * 7);
      b.vx += (b.dirX * sp - b.vx) * k;
      b.vy += (b.dirY * sp - b.vy) * k;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const lim = b.r * 0.5;
    if (b.x < lim) { b.x = lim; b.vx = 0; }
    if (b.y < lim) { b.y = lim; b.vy = 0; }
    if (b.x > ARENA - lim) { b.x = ARENA - lim; b.vx = 0; }
    if (b.y > ARENA - lim) { b.y = ARENA - lim; b.vy = 0; }
    b.comboT -= dt;
    if (b.comboT <= 0) b.combo = 0;
    // Big blobs slowly melt so the leader can be caught.
    if (b.mass > 120) b.mass -= (b.mass - 120) * 0.006 * (1 + b.mass / 1500) * Math.pow(0.6, perkLevel(b, 'skin')) * dt;
    b.r = radius(b.mass);
  }

  // Food behaviour
  for (const f of S.food) {
    if (f.dead) continue;
    f.t += dt; f.age += dt;
    if (f.ownerT) f.ownerT -= dt;
    if (f.kind === 'critter' || f.kind === 'gold') {
      // Flee from anything that could eat it.
      let fx = 0, fy = 0;
      for (const b of S.blobs) {
        if (!b.alive || f.r > b.r * 0.9) continue;
        const dx = f.x - b.x, dy = f.y - b.y, d = Math.hypot(dx, dy);
        const range = b.r + (f.kind === 'gold' ? 230 : 140);
        if (d < range && d > 0) { const w = (range - d) / range; fx += dx / d * w; fy += dy / d * w; }
      }
      const base = (f.kind === 'gold' ? 0.95 : 0.68) * 270 * Math.pow(f.mass, -0.17);
      if (fx || fy) {
        const m = Math.hypot(fx, fy);
        f.a = Math.atan2(fy, fx);
        f.vx += (fx / m * base - f.vx) * Math.min(1, dt * 5);
        f.vy += (fy / m * base - f.vy) * Math.min(1, dt * 5);
      } else {
        f.a += (S.rand() - 0.5) * 3 * dt;
        f.vx += (Math.cos(f.a) * base * 0.3 - f.vx) * Math.min(1, dt * 2);
        f.vy += (Math.sin(f.a) * base * 0.3 - f.vy) * Math.min(1, dt * 2);
      }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < 30 || f.x > ARENA - 30) { f.vx *= -1; f.a = Math.PI - f.a; }
      if (f.y < 30 || f.y > ARENA - 30) { f.vy *= -1; f.a = -f.a; }
      f.x = clampA(f.x); f.y = clampA(f.y);
    } else if (f.vx || f.vy) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      const k = Math.pow(0.04, dt);
      f.vx *= k; f.vy *= k;
      if (Math.abs(f.vx) + Math.abs(f.vy) < 2) { f.vx = 0; f.vy = 0; }
      f.x = clampA(f.x); f.y = clampA(f.y);
    }
  }

  // Eating food (plus magnet)
  for (const b of S.blobs) {
    if (!b.alive) continue;
    const mr = magnetRange(b);
    queryFood(S, b.x, b.y, b.r + mr + 20, tmp);
    for (const f of tmp) {
      if (f.dead || f.r > b.r * 0.9) continue;
      if (f.owner === b.id && f.ownerT > 0) continue;
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy);
      if (d < b.r - f.r * 0.3) {
        f.dead = true;
        const src = f.kind === 'gold' ? 'gold' : f.kind === 'bit' ? 'bit' : 'food';
        const gain = addMass(S, b, f.mass, src);
        if (f.kind === 'gold' && b.isPlayer) b.gold += 5;
        if (b.isPlayer || f.kind === 'gold') S.events.push({ type: 'eat', id: b.id, kind: f.kind, x: f.x, y: f.y, gain, combo: b.combo, hue: f.hue, player: b.isPlayer });
      } else if ((f.kind === 'crumb' || f.kind === 'bit') && d < b.r + mr && d > 0) {
        const pull = (1 - (d - b.r) / mr) * 380 * dt;
        f.x += dx / d * pull; f.y += dy / d * pull;
      }
    }
  }

  // Spikes
  for (const s of S.spikes) {
    if (s.dead) { s.respawn -= dt; continue; }
    s.rot += dt * 0.3;
    for (const b of S.blobs) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - s.x, b.y - s.y);
      if (b.mass >= s.mass * 1.4) {
        if (d < b.r - s.r * 0.3) {
          s.dead = true; s.respawn = 12;
          addMass(S, b, s.mass * 0.5, 'food');
          S.events.push({ type: 'spikeEat', id: b.id, x: s.x, y: s.y, player: b.isPlayer });
          break;
        }
      } else if (spikeHurts(b, s) && b.spikeT <= 0 && d < b.r + s.r * 0.75) {
        b.spikeT = 1.2;
        const lost = loseMass(S, b, 0.22, b.x, b.y, b.vx, b.vy);
        const nx = (b.x - s.x) / (d || 1), ny = (b.y - s.y) / (d || 1);
        b.vx = nx * 420; b.vy = ny * 420; b.dashT = 0.18;
        b.combo = 0;
        S.events.push({ type: 'spike', id: b.id, x: b.x, y: b.y, lost, player: b.isPlayer });
      }
    }
  }
  for (let i = S.spikes.length - 1; i >= 0; i--) {
    const s = S.spikes[i];
    if (s.dead && s.respawn <= 0) { S.spikes.splice(i, 1); spawnSpike(S, s.mass); }
  }

  // Blob vs blob
  const alive = S.blobs.filter((b) => b.alive).sort((a, b) => b.mass - a.mass);
  for (let i = 0; i < alive.length; i++) {
    const a = alive[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < alive.length; j++) {
      const v = alive[j];
      if (!v.alive || v.spawnT > 0 || a.spawnT > 0) continue;
      if (!canEat(a, v)) continue;
      const d = Math.hypot(a.x - v.x, a.y - v.y);
      if (d < a.r - v.r * 0.35) kill(S, a, v);
    }
  }

  // Cleanup + respawn food
  if (S.food.some((f) => f.dead) ) S.food = S.food.filter((f) => !f.dead && !(f.kind === 'bit' && f.age > 40));
  S.foodTimer -= dt;
  if (S.foodTimer <= 0) {
    S.foodTimer = 0.25;
    let crumbs = 0, critters = 0, golds = 0;
    for (const f of S.food) { if (f.kind === 'crumb') crumbs++; else if (f.kind === 'critter') critters++; else if (f.kind === 'gold') golds++; }
    const crumbTarget = S.frenzy ? CRUMBS * 1.4 : CRUMBS;
    for (let k = 0; k < (S.frenzy ? 20 : 10) && crumbs < crumbTarget; k++, crumbs++) spawnFood(S, 'crumb');
    if (critters < CRITTERS) spawnFood(S, 'critter');
    if (golds < (S.frenzy ? 14 : GOLDS) && S.rand() < (S.frenzy ? 0.6 : 0.05)) spawnFood(S, 'gold');
  }

  // End conditions
  if (!S.over && (!S.player.alive || S.t >= ROUND_TIME || S.aliveCount <= 1)) finish(S);
}

// Called by the revive flow: the player comes back where they died with half their peak.
export function revive(S) {
  const p = S.player;
  if (p.alive) return;
  p.alive = true; S.aliveCount++;
  p.mass = Math.max(S.meta.startMass, p.peak * 0.5);
  p.r = radius(p.mass);
  p.spawnT = 3; p.vx = 0; p.vy = 0; p.combo = 0;
  // Pop somewhere safe: far from anyone who could eat us.
  let bestX = p.x, bestY = p.y, bestD = -1;
  for (let k = 0; k < 40; k++) {
    const x = 200 + S.rand() * (ARENA - 400), y = 200 + S.rand() * (ARENA - 400);
    let dmin = 1e9;
    for (const b of S.blobs) if (b.alive && b !== p && canEat(b, p)) dmin = Math.min(dmin, Math.hypot(b.x - x, b.y - y) - b.r);
    if (dmin > bestD) { bestD = dmin; bestX = x; bestY = y; }
  }
  p.x = bestX; p.y = bestY;
  S.over = false; S.result = null; S.spectate = false;
  S.events.push({ type: 'revive' });
}

function finish(S) {
  S.over = true;
  const alive = S.blobs.filter((b) => b.alive).sort((a, b) => b.mass - a.mass);
  alive.forEach((b, i) => { b.placement = i + 1; });
  const p = S.player;
  S.result = {
    placement: p.placement, alive: p.alive, killer: p.killer,
    mass: Math.round(p.alive ? p.mass : p.peak), peak: Math.round(p.peak), kills: p.kills, time: S.t,
    level: p.level, gold: p.gold, timeUp: S.t >= ROUND_TIME,
  };
}

export function leaderboard(S) {
  return S.blobs.filter((b) => b.alive).sort((a, b) => b.mass - a.mass);
}

// Drives a blob with the bot brain (used by the balance tool and the attract mode).
export function autopilot(S, b, skill = 0.7) {
  const saved = b.skill;
  b.skill = skill;
  b.ai.t -= DT;
  if (b.ai.t <= 0) think(S, b);
  b.skill = saved;
  return { x: b.ai.tx, y: b.ai.ty, dash: b.ai.dash };
}
