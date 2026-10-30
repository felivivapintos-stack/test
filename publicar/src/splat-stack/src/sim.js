// Deterministic simulation shared by the game and by tools/solve.mjs.
// Fixed 60 Hz step, no DOM, no randomness.

export const TILE = 32, COLS = 30, ROWS = 17, W = COLS * TILE, H = ROWS * TILE;
export const PW = 22, PH = 22;

const GRAV = 0.8, MAX_FALL = 14, RUN = 4.6, ACC_GROUND = 0.9, ACC_AIR = 0.55;
const JUMP_V = -13, JUMP_CUT = -4, SPRING_V = -18.5, COYOTE = 6, BUFFER = 7;
export const RESPAWN = 26;
const CRUMBLE_DELAY = 22;

export const EMPTY = 0, SOLID = 1, SPIKE = 2, LAVA = 3;
// How far below the tile top a splat rests on hazards.
const SPLAT_OFFSET = [0, 0, 8, 10];

export function parseLevel(def) {
  const rows = def.map;
  if (rows.length !== ROWS) throw new Error(`${def.name}: ${rows.length} rows, expected ${ROWS}`);
  const grid = new Uint8Array(COLS * ROWS);
  const L = {
    name: def.name, hint: def.hint || '', par: def.par ?? 0, grid,
    spawn: null, door: null, doorAlt: null,
    crumbles: [], pops: [], drops: [], springs: [], saws: [],
  };
  rows.forEach((row, r) => {
    if (row.length !== COLS) throw new Error(`${def.name}: row ${r} has ${row.length} cols`);
    for (let c = 0; c < COLS; c++) {
      const ch = row[c], x = c * TILE, y = r * TILE;
      switch (ch) {
        case '#': grid[r * COLS + c] = SOLID; break;
        case '^': grid[r * COLS + c] = SPIKE; break;
        case '~': grid[r * COLS + c] = LAVA; break;
        case 'P': L.spawn = { x: x + (TILE - PW) / 2, y: y + TILE - PH }; break;
        case 'D': L.door = { x, y }; break;
        case 'd': L.doorAlt = { x, y }; break;
        case 'C': L.crumbles.push({ x, y }); break;
        case 'p': L.pops.push({ x, y }); break;
        case 'v': L.drops.push({ x, y }); break;
        case 'S': L.springs.push({ x, y }); break;
        case '.': break;
        default: throw new Error(`${def.name}: unknown tile '${ch}' at ${c},${r}`);
      }
    }
  });
  if (!L.spawn || !L.door) throw new Error(`${def.name}: needs P and D`);
  for (const s of def.saws || []) {
    const [c1, r1, c2, r2, period = 120, phase = 0, radius = 18] = s;
    L.saws.push({
      ax: c1 * TILE + TILE / 2, ay: r1 * TILE + TILE / 2,
      bx: c2 * TILE + TILE / 2, by: r2 * TILE + TILE / 2, period, phase, r: radius,
    });
  }
  L.sawCycle = L.saws.reduce((a, s) => lcm(a, s.period), 1);
  return L;
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a * b) / gcd(a, b); }

export function tileAt(L, c, r) {
  if (c < 0 || c >= COLS) return SOLID;
  if (r < 0 || r >= ROWS) return EMPTY;
  return L.grid[r * COLS + c];
}

export function sawPos(s, t) {
  const k = ((t + s.phase) % s.period) / s.period;
  const f = k < 0.5 ? k * 2 : 2 - k * 2;
  const e = f * f * (3 - 2 * f);
  return { x: s.ax + (s.bx - s.ax) * e, y: s.ay + (s.by - s.ay) * e };
}

function newPlayer(L) {
  return {
    x: L.spawn.x, y: L.spawn.y, vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0,
    jumping: false, prevJ: false, dead: 0, face: 1,
  };
}

export function createState(L) {
  return {
    t: 0, deaths: 0, won: false, doorMoved: false,
    p: newPlayer(L),
    sawT: L.saws.map(() => 0), // each saw's own clock; it stops while a splat jams it
    jam: L.saws.map(() => false),
    splats: [],
    crumble: L.crumbles.map(() => -1), // -1 intact, >0 counting down, 0 gone
    pop: L.pops.map(() => 0), // 0 hidden, 1 out
    drop: L.drops.map(() => ({ s: 0, y: 0, vy: 0 })), // s: 0 idle, 1 falling, 2 gone
    events: [],
  };
}

export function cloneState(S) {
  return {
    t: S.t, deaths: S.deaths, won: S.won, doorMoved: S.doorMoved,
    p: { ...S.p },
    sawT: S.sawT.slice(),
    jam: S.jam.slice(),
    splats: S.splats.map((s) => ({ ...s })),
    crumble: S.crumble.slice(),
    pop: S.pop.slice(),
    drop: S.drop.map((d) => ({ ...d })),
    events: [],
  };
}

export function doorPos(L, S) {
  return S.doorMoved && L.doorAlt ? L.doorAlt : L.door;
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Collects solid rects overlapping the box. forSplat: hazards count as solid (with offset).
function solids(L, S, x, y, w, h, forSplat, self, out) {
  out.length = 0;
  const c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 0.001) / TILE);
  const r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(L, c, r);
      if (t === SOLID || (forSplat && t !== EMPTY)) {
        const off = SPLAT_OFFSET[t];
        const rx = c * TILE, ry = r * TILE + off;
        if (overlap(x, y, w, h, rx, ry, TILE, TILE - off)) out.push({ x: rx, y: ry, w: TILE, h: TILE - off, k: 't' });
      }
    }
  }
  for (let i = 0; i < L.crumbles.length; i++) {
    if (S.crumble[i] === 0) continue;
    const b = L.crumbles[i];
    if (overlap(x, y, w, h, b.x, b.y, TILE, TILE)) out.push({ x: b.x, y: b.y, w: TILE, h: TILE, k: 'c', i });
  }
  if (forSplat) {
    for (let i = 0; i < L.pops.length; i++) {
      if (!S.pop[i]) continue;
      const b = L.pops[i];
      if (overlap(x, y, w, h, b.x, b.y + 8, TILE, TILE - 8)) out.push({ x: b.x, y: b.y + 8, w: TILE, h: TILE - 8, k: 'p' });
    }
  }
  for (let i = 0; i < S.splats.length; i++) {
    if (i === self) continue;
    const s = S.splats[i];
    if (overlap(x, y, w, h, s.x, s.y, PW, PH)) out.push({ x: s.x, y: s.y, w: PW, h: PH, k: 's' });
  }
  return out;
}

const hits = [];

function killedBy(L, S, p) {
  const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + PW) / TILE);
  const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + PH) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(L, c, r);
      if (t === SPIKE && overlap(p.x, p.y, PW, PH, c * TILE + 6, r * TILE + 14, 20, 18)) return 'spike';
      if (t === LAVA && overlap(p.x, p.y, PW, PH, c * TILE, r * TILE + 10, TILE, 22)) return 'lava';
    }
  }
  for (let i = 0; i < L.pops.length; i++) {
    const b = L.pops[i];
    if (S.pop[i] && overlap(p.x, p.y, PW, PH, b.x + 6, b.y + 14, 20, 18)) return 'spike';
  }
  for (let i = 0; i < L.drops.length; i++) {
    const d = S.drop[i];
    if (d.s === 2) continue;
    const b = L.drops[i];
    if (overlap(p.x, p.y, PW, PH, b.x + 8, b.y + d.y + 2, 16, 24)) return 'drop';
  }
  for (let i = 0; i < L.saws.length; i++) {
    if (S.jam[i]) continue; // a jammed blade has stopped spinning and no longer cuts
    const s = L.saws[i], q = sawPos(s, S.sawT[i]);
    const nx = Math.max(p.x, Math.min(q.x, p.x + PW)), ny = Math.max(p.y, Math.min(q.y, p.y + PH));
    const dx = q.x - nx, dy = q.y - ny, r = s.r - 3;
    if (dx * dx + dy * dy < r * r) return 'saw';
  }
  if (p.y > H + 8) return 'void';
  return null;
}

function resetTraps(L, S) {
  S.crumble.fill(-1);
  S.pop.fill(0);
  for (const d of S.drop) { d.s = 0; d.y = 0; d.vy = 0; }
}

function respawn(L, S) {
  const p = newPlayer(L);
  // Never respawn inside a splat: climb on top of whatever is there.
  for (let guard = 0; guard < 20; guard++) {
    solids(L, S, p.x, p.y, PW, PH, false, -1, hits);
    if (!hits.length) break;
    p.y = Math.min(...hits.map((h) => h.y)) - PH;
  }
  S.p = p;
}

function die(L, S, cause) {
  const p = S.p;
  S.deaths++;
  p.dead = RESPAWN;
  S.events.push({ type: 'die', cause, x: p.x, y: p.y });
  if (cause !== 'void') {
    S.splats.push({ x: p.x, y: p.y, vy: Math.max(0, Math.min(p.vy, 4)) });
  }
}

function updateSplats(L, S) {
  for (let i = 0; i < S.splats.length; i++) {
    const s = S.splats[i];
    const prevBottom = s.y + PH;
    s.vy = Math.min(s.vy + GRAV, MAX_FALL);
    s.y += s.vy;
    solids(L, S, s.x, s.y, PW, PH, true, i, hits);
    // Land on things that were below us. A corpse made inside spikes or lava still
    // rests on top of them, but only if it is mostly over them: grazing a spike from
    // the side, or appearing next to another corpse, must never lift a splat.
    let top = Infinity;
    for (const h of hits) {
      const fromAbove = h.y >= prevBottom - 1;
      const mostlyOver = h.k !== 's' && Math.min(s.x + PW, h.x + h.w) - Math.max(s.x, h.x) >= PW / 2;
      if (fromAbove || mostlyOver) top = Math.min(top, h.y);
    }
    if (top !== Infinity) {
      if (s.vy > 2) S.events.push({ type: 'thud', x: s.x, y: top });
      s.y = top - PH;
      s.vy = 0;
    }
  }
  for (let i = S.splats.length - 1; i >= 0; i--) if (S.splats[i].y > H + 64) S.splats.splice(i, 1);
}

function updateTraps(L, S) {
  const p = S.p, alive = !p.dead;
  const pcx = p.x + PW / 2, pb = p.y + PH;
  for (let i = 0; i < L.crumbles.length; i++) {
    if (S.crumble[i] > 0 && --S.crumble[i] === 0) S.events.push({ type: 'crumble', x: L.crumbles[i].x, y: L.crumbles[i].y });
  }
  for (let i = 0; i < L.pops.length; i++) {
    if (S.pop[i] || !alive) continue;
    const b = L.pops[i];
    if (Math.abs(pcx - (b.x + TILE / 2)) < 44 && pb > b.y - 64 && pb < b.y + TILE + 10) {
      S.pop[i] = 1;
      S.events.push({ type: 'pop', x: b.x, y: b.y });
    }
  }
  for (let i = 0; i < L.drops.length; i++) {
    const d = S.drop[i], b = L.drops[i];
    if (d.s === 0 && alive && Math.abs(pcx - (b.x + TILE / 2)) < 26 && p.y > b.y) {
      d.s = 1;
      S.events.push({ type: 'drop', x: b.x, y: b.y });
    }
    if (d.s === 1) {
      d.vy = Math.min(d.vy + 0.9, 16);
      d.y += d.vy;
      const tipY = b.y + d.y + TILE;
      const c = Math.floor((b.x + TILE / 2) / TILE), r = Math.floor(tipY / TILE);
      let hit = tipY > H + 32 || tileAt(L, c, r) === SOLID;
      for (const s of S.splats) if (overlap(b.x + 8, b.y + d.y, 16, TILE, s.x, s.y, PW, PH)) hit = true;
      if (hit) { d.s = 2; S.events.push({ type: 'shatter', x: b.x, y: b.y + d.y }); }
    }
  }
}

function circleHitsBox(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// A saw advances along its path unless a splat sits in the blade: corpses jam saws.
function updateSaws(L, S) {
  for (let i = 0; i < L.saws.length; i++) {
    const s = L.saws[i], q = sawPos(s, S.sawT[i] + 1);
    let jammed = false;
    for (const sp of S.splats) if (sp.vy === 0 && circleHitsBox(q.x, q.y, s.r - 2, sp.x, sp.y, PW, PH)) { jammed = true; break; }
    if (jammed && !S.jam[i]) S.events.push({ type: 'jam', x: q.x, y: q.y });
    if (!jammed) S.sawT[i]++;
    S.jam[i] = jammed;
  }
}

export function step(L, S, input) {
  S.events.length = 0;
  if (S.won) return S;
  S.t++;
  updateSaws(L, S);
  const p = S.p;
  if (p.dead) {
    updateSplats(L, S);
    if (--p.dead === 0) {
      resetTraps(L, S);
      respawn(L, S);
      S.events.push({ type: 'respawn', x: S.p.x, y: S.p.y });
    }
    return S;
  }

  const dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  if (dir) p.face = dir;
  const target = dir * RUN, acc = p.ground ? ACC_GROUND : ACC_AIR;
  p.vx += Math.max(-acc, Math.min(acc, target - p.vx));

  const pressed = input.j && !p.prevJ;
  p.prevJ = !!input.j;
  if (p.ground) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote--;
  if (pressed) p.buffer = BUFFER; else if (p.buffer > 0) p.buffer--;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = JUMP_V; p.buffer = 0; p.coyote = 0; p.jumping = true; p.ground = false;
    S.events.push({ type: 'jump', x: p.x, y: p.y });
  }
  if (p.jumping && !input.j && p.vy < JUMP_CUT) p.vy = JUMP_CUT;
  if (p.vy >= 0) p.jumping = false;
  p.vy = Math.min(p.vy + GRAV, MAX_FALL);

  // Horizontal
  p.x += p.vx;
  solids(L, S, p.x, p.y, PW, PH, false, -1, hits);
  if (hits.length) {
    if (p.vx > 0) p.x = Math.min(...hits.map((h) => h.x)) - PW;
    else if (p.vx < 0) p.x = Math.max(...hits.map((h) => h.x + h.w));
    p.vx = 0;
  }
  // Vertical
  const wasGround = p.ground, fallV = p.vy;
  p.y += p.vy;
  p.ground = false;
  solids(L, S, p.x, p.y, PW, PH, false, -1, hits);
  if (hits.length) {
    if (p.vy > 0) {
      p.y = Math.min(...hits.map((h) => h.y)) - PH;
      p.ground = true;
      for (const h of hits) {
        if (h.k === 'c' && S.crumble[h.i] === -1) { S.crumble[h.i] = CRUMBLE_DELAY; S.events.push({ type: 'shake', x: h.x, y: h.y }); }
      }
      if (!wasGround && fallV > 3) S.events.push({ type: 'land', x: p.x, y: p.y, v: fallV });
    } else if (p.vy < 0) {
      p.y = Math.max(...hits.map((h) => h.y + h.h));
      S.events.push({ type: 'bonk', x: p.x, y: p.y });
    }
    p.vy = 0;
  }
  // Springs
  for (const sp of L.springs) {
    if (p.vy >= 0 && overlap(p.x, p.y, PW, PH, sp.x + 4, sp.y + 18, 24, 14)) {
      p.vy = SPRING_V; p.jumping = false; p.ground = false; p.coyote = 0;
      S.events.push({ type: 'spring', x: sp.x, y: sp.y });
    }
  }

  updateTraps(L, S);
  updateSplats(L, S);

  // Door
  const pcx = p.x + PW / 2, pcy = p.y + PH / 2;
  if (L.doorAlt && !S.doorMoved) {
    const dx = pcx - (L.door.x + TILE / 2), dy = pcy - (L.door.y + TILE / 2);
    if (dx * dx + dy * dy < 95 * 95) { S.doorMoved = true; S.events.push({ type: 'door', x: L.door.x, y: L.door.y }); }
  }
  const d = doorPos(L, S);
  const doorReady = !L.doorAlt || S.doorMoved;
  if (doorReady && overlap(p.x, p.y, PW, PH, d.x + 8, d.y - 6, 16, 38)) {
    S.won = true;
    S.events.push({ type: 'win', x: d.x, y: d.y });
    return S;
  }

  const cause = killedBy(L, S, p);
  if (cause) die(L, S, cause);
  return S;
}
