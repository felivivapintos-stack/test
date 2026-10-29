// Match simulation: movement, gunfire, grenades, scorestreaks and bot AI.
// Deterministic for a given seed and inputs, and free of the DOM so tools/test.mjs can run it.
import { WEAPONS, PRIMARIES, STREAKS, MODES, BOT_NAMES } from './data.js';
import {
  TILE, buildMap, cellHeight, cellCenter, cellOf, moveAxis, groundUnder, raycast, lineOfSight, findPath,
} from './map.js';

export const DT = 1 / 60;
const RADIUS = 0.35;
const GRAVITY = 17;
const JUMP = 5.7;
const WALK = 5.0;
const RESPAWN = 3;
const REGEN_DELAY = 4;
const DRONE_GUN = { dmg: 14, head: 1, range: 200, falloff: 1 };

const STANCE = {
  stand: { eye: 1.62, top: 1.8 },
  crouch: { eye: 1.1, top: 1.25 },
  slide: { eye: 0.85, top: 1.0 },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stanceOf(p) {
  return p.slideT > 0 ? STANCE.slide : p.crouch ? STANCE.crouch : STANCE.stand;
}
export function eyeY(p) { return p.y + stanceOf(p).eye; }
export function weaponOf(p) { return WEAPONS[p.weapons[p.cur].id]; }
export function lookDir(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
}

export function emptyControls() {
  return {
    mx: 0, mz: 0, dyaw: 0, dpitch: 0, fire: false, ads: false, sprint: false,
    jump: false, crouch: false, reload: false, swap: false, nade: false,
  };
}

// opts: { mode: 'tdm'|'ffa', seed, difficulty (0..1), human: { name, primary } | null }
export function createMatch(opts = {}) {
  const cfg = MODES[opts.mode || 'tdm'];
  const s = {
    mode: opts.mode || 'tdm', cfg, map: buildMap(), rng: mulberry32(opts.seed || 1),
    t: 0, timeLeft: cfg.time, over: false, winner: null,
    players: [], grenades: [], strikes: [], drones: [], events: [],
    teamScore: [0, 0], uav: {}, skill: opts.difficulty ?? 0.5,
  };
  const names = BOT_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(s.rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  for (let i = 0; i < cfg.players; i++) {
    const team = cfg.teams ? i % 2 : i;
    const human = i === 0 && opts.human;
    const primary = human ? opts.human.primary : PRIMARIES[Math.floor(s.rng() * PRIMARIES.length)];
    const p = makePlayer(i, team, human ? opts.human.name : names[i % names.length], primary);
    if (!human) p.bot = makeBrain(s);
    s.players.push(p);
    spawn(s, p, true);
  }
  return s;
}

function makePlayer(id, team, name, primary) {
  return {
    id, team, name, bot: null,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0,
    hp: 100, alive: false, respawn: 0,
    weapons: [mkWeapon(primary), mkWeapon('p9')], cur: 0,
    fireCd: 0, reloadT: 0, swapT: 0, ads: 0, sprint: false, crouch: false, slideT: 0, onGround: true,
    triggerHeld: false, recoilDebt: 0, bloom: 0, nades: 2, nadeCd: 0,
    kills: 0, deaths: 0, streak: 0, bestStreak: 0, headshots: 0, earned: [],
    lastHurt: -99, lastFire: -99, hurtBy: -1, killedBy: -1, spawnT: 0, flash: 0,
  };
}

function mkWeapon(id) {
  const w = WEAPONS[id];
  return { id, mag: w.mag, reserve: w.reserve };
}

function enemies(s, a, b) {
  return a.team !== b.team;
}

// Picks the spawn cell that is far from enemies, out of their sight and (in TDM) near friends.
function spawn(s, p, first) {
  const map = s.map;
  let candidates;
  if (first && s.cfg.teams) candidates = map.spawns[p.team];
  else {
    candidates = [];
    for (let k = 0; k < 40; k++) candidates.push(map.floor[Math.floor(s.rng() * map.floor.length)]);
    if (s.cfg.teams) for (let k = 0; k < 6; k++) candidates.push(map.spawns[p.team][Math.floor(s.rng() * map.spawns[p.team].length)]);
  }
  let best = candidates[0], bestScore = -Infinity;
  for (const c of candidates) {
    const [x, z] = cellCenter(map, c);
    let minEnemy = 60, minFriend = 60, seen = 0;
    for (const o of s.players) {
      if (o === p || !o.alive) continue;
      const d = Math.hypot(o.x - x, o.z - z);
      if (enemies(s, o, p)) {
        minEnemy = Math.min(minEnemy, d);
        if (d < 45 && lineOfSight(map, o.x, eyeY(o), o.z, x, 1.6, z)) seen++;
      } else minFriend = Math.min(minFriend, d);
    }
    let score = Math.min(minEnemy, 30) - seen * 25 + s.rng() * 4;
    if (s.cfg.teams) score -= Math.max(0, minFriend - 12) * 0.3;
    if (first) score = s.rng();
    if (score > bestScore) { bestScore = score; best = c; }
  }
  const [x, z] = cellCenter(map, best);
  Object.assign(p, {
    x: x + (s.rng() - 0.5) * 0.6, y: 0, z: z + (s.rng() - 0.5) * 0.6, vx: 0, vy: 0, vz: 0,
    hp: 100, alive: true, cur: 0, fireCd: 0, reloadT: 0, swapT: 0, ads: 0, sprint: false, crouch: false,
    slideT: 0, recoilDebt: 0, bloom: 0, nades: 2, spawnT: s.t, lastHurt: -99, hurtBy: -1, triggerHeld: false,
  });
  p.weapons = p.weapons.map((w) => mkWeapon(w.id));
  // face the middle of the map
  p.yaw = Math.atan2(map.w * TILE / 2 - p.x, map.h * TILE / 2 - p.z);
  p.pitch = 0;
  if (p.bot) resetBrain(p.bot);
  if (!first) s.events.push({ type: 'spawn', id: p.id });
}

// ---------------------------------------------------------------- step

export function step(s, humanControls) {
  if (s.over) return;
  s.t += DT;
  s.timeLeft -= DT;
  for (const p of s.players) {
    if (!p.alive) {
      p.respawn -= DT;
      if (p.respawn <= 0) spawn(s, p, false);
      continue;
    }
    const c = p.bot ? botThink(s, p) : humanControls || emptyControls();
    updatePlayer(s, p, c);
  }
  updateGrenades(s);
  updateStrikes(s);
  updateDrones(s);
  if (s.timeLeft <= 0) endMatch(s);
}

function updatePlayer(s, p, c) {
  const w = weaponOf(p);
  const slot = p.weapons[p.cur];

  // look + recoil recovery
  p.yaw += c.dyaw;
  const recover = Math.min(p.recoilDebt, p.recoilDebt * 7 * DT + 0.002 * DT * 60);
  p.recoilDebt -= recover;
  p.pitch = clamp(p.pitch + c.dpitch - recover, -1.45, 1.45);
  p.bloom = Math.max(0, p.bloom - p.bloom * 5 * DT);

  // stance
  const speedH = Math.hypot(p.vx, p.vz);
  if (c.jump && p.onGround) {
    p.vy = JUMP; p.onGround = false; p.crouch = false; p.slideT = 0;
    s.events.push({ type: 'jump', id: p.id });
  }
  if (c.crouch) {
    if (p.sprint && p.onGround && speedH > 6 && p.slideT <= 0) {
      p.slideT = 0.75;
      const k = Math.max(speedH, 9.5) / (speedH || 1);
      p.vx *= k; p.vz *= k;
      p.crouch = true;
      s.events.push({ type: 'slide', id: p.id });
    } else if (p.slideT <= 0) p.crouch = !p.crouch;
  }
  p.sprint = c.sprint && c.mz > 0.5 && !c.fire && p.ads < 0.3 && p.slideT <= 0 && p.reloadT <= 0;
  if (p.sprint && p.crouch && p.slideT <= 0) p.crouch = false;

  // horizontal movement
  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  const rx = -fz, rz = fx;
  let wx = fx * c.mz + rx * c.mx, wz = fz * c.mz + rz * c.mx;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }
  if (p.slideT > 0) {
    p.slideT -= DT;
    const k = 1 - 1.1 * DT;
    p.vx *= k; p.vz *= k;
    if (p.slideT <= 0 || Math.hypot(p.vx, p.vz) < 3) p.slideT = 0;
  } else {
    let speed = WALK * w.move;
    if (p.sprint) speed *= 1.45;
    if (p.crouch) speed *= 0.55;
    speed *= lerp(1, 0.6, p.ads);
    const accel = p.onGround ? 12 : 2.5;
    p.vx += (wx * speed - p.vx) * Math.min(1, accel * DT);
    p.vz += (wz * speed - p.vz) * Math.min(1, accel * DT);
  }
  if (moveAxis(s.map, p, 0, p.vx * DT, RADIUS)) p.vx = 0;
  if (moveAxis(s.map, p, 2, p.vz * DT, RADIUS)) p.vz = 0;

  // vertical movement
  p.vy -= GRAVITY * DT;
  p.y += p.vy * DT;
  const ground = groundUnder(s.map, p.x, p.z, p.y - p.vy * DT, RADIUS);
  if (p.y <= ground) {
    if (!p.onGround && p.vy < -6) s.events.push({ type: 'land', id: p.id });
    p.y = ground; p.vy = 0; p.onGround = true;
  } else p.onGround = p.y - ground < 0.05;

  // weapon timers
  if (p.swapT > 0) p.swapT -= DT;
  if (c.swap && p.swapT <= 0) {
    p.cur = 1 - p.cur; p.swapT = 0.45; p.reloadT = 0; p.fireCd = 0;
    s.events.push({ type: 'swap', id: p.id });
  }
  const cw = weaponOf(p), cs = p.weapons[p.cur];
  if (p.reloadT > 0) {
    p.reloadT -= DT;
    if (p.reloadT <= 0) {
      const take = Math.min(cw.mag - cs.mag, cs.reserve);
      cs.mag += take; cs.reserve -= take; p.reloadT = 0;
    }
  }
  const wantReload = c.reload || (c.fire && cs.mag === 0);
  if (wantReload && p.reloadT <= 0 && p.swapT <= 0 && cs.mag < cw.mag && cs.reserve > 0) {
    p.reloadT = cw.reload; p.sprint = false;
    s.events.push({ type: 'reload', id: p.id });
  }
  if (cs.mag === 0 && cs.reserve === 0 && p.cur === 0 && p.swapT <= 0) {
    p.cur = 1; p.swapT = 0.45;
  }
  const adsTarget = c.ads && !p.sprint && p.swapT <= 0 ? 1 : 0;
  p.ads = clamp(p.ads + (adsTarget ? 1 : -1.6) * DT / cw.adsTime, 0, 1);

  // fire
  if (p.fireCd > 0) p.fireCd -= DT;
  const canFire = p.reloadT <= 0 && p.swapT <= 0 && cs.mag > 0 && (cw.auto || !p.triggerHeld);
  if (c.fire && canFire && p.fireCd <= 0) {
    fire(s, p, cw, cs);
    p.fireCd += 60 / cw.rpm;
  }
  if (!c.fire && p.fireCd < 0) p.fireCd = 0;
  p.triggerHeld = c.fire;
  if (p.flash > 0) p.flash -= DT;

  // grenade
  if (p.nadeCd > 0) p.nadeCd -= DT;
  if (c.nade && p.nades > 0 && p.nadeCd <= 0 && p.reloadT <= 0) {
    p.nades--; p.nadeCd = 1;
    const d = lookDir(p.yaw, p.pitch + 0.12);
    s.grenades.push({
      owner: p.id, team: p.team, x: p.x + d[0] * 0.5, y: eyeY(p) - 0.1, z: p.z + d[2] * 0.5,
      vx: d[0] * 15 + p.vx * 0.5, vy: d[1] * 15 + 2, vz: d[2] * 15 + p.vz * 0.5, fuse: 2.2,
    });
    s.events.push({ type: 'throw', id: p.id });
  }

  // health regen
  if (p.hp < 100 && s.t - p.lastHurt > REGEN_DELAY) p.hp = Math.min(100, p.hp + 35 * DT);
}

function fire(s, p, w, slot) {
  slot.mag--;
  p.lastFire = s.t;
  p.sprint = false;
  p.flash = 0.05;
  const moving = Math.hypot(p.vx, p.vz) > 1.5 ? 1 : 0;
  let spread = lerp(w.hip, w.ads, p.ads) + p.bloom;
  spread += moving * w.hip * 0.5 * (1 - p.ads);
  if (!p.onGround) spread += w.hip;
  if (p.crouch && p.slideT <= 0) spread *= 0.8;
  if (w.scope && p.ads < 0.95) spread = Math.max(spread, w.hip);
  const ox = p.x, oy = eyeY(p), oz = p.z;
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const a = s.rng() * Math.PI * 2, r = Math.sqrt(s.rng()) * spread;
    const d = lookDir(p.yaw + Math.cos(a) * r, p.pitch + Math.sin(a) * r);
    hitscan(s, p, ox, oy, oz, d, w, p.weapons[p.cur].id);
  }
  const kick = w.recoil * (p.ads > 0.5 ? 0.65 : 1) * (p.crouch ? 0.8 : 1);
  p.pitch = Math.min(1.45, p.pitch + kick);
  p.recoilDebt += kick * 0.85;
  p.yaw += (s.rng() - 0.5) * kick * 0.6;
  p.bloom += w.recoil * 0.4 * (1 - p.ads * 0.7);
  s.events.push({ type: 'fire', id: p.id, weapon: slot.id });
}

// Ray against an axis-aligned box; returns entry distance or Infinity.
function rayBox(ox, oy, oz, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  const o = [ox, oy, oz], lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < lo[k] || o[k] > hi[k]) return Infinity;
      continue;
    }
    let a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    if (a > tmin) tmin = a;
    if (b < tmax) tmax = b;
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

function hitscan(s, shooter, ox, oy, oz, d, w, weaponId, maxT = 200) {
  const wall = raycast(s.map, ox, oy, oz, d[0], d[1], d[2], maxT);
  let best = wall ? wall.t : maxT, victim = null, head = false, drone = null;
  for (const v of s.players) {
    if (!v.alive || v === shooter || !enemies(s, shooter, v)) continue;
    const top = v.y + stanceOf(v).top;
    const tb = rayBox(ox, oy, oz, d, v.x - 0.33, v.y, v.z - 0.33, v.x + 0.33, top - 0.3, v.z + 0.33);
    const th = rayBox(ox, oy, oz, d, v.x - 0.18, top - 0.32, v.z - 0.18, v.x + 0.18, top, v.z + 0.18);
    if (th < best) { best = th; victim = v; head = true; }
    if (tb < best) { best = tb; victim = v; head = false; }
  }
  for (const dr of s.drones) {
    if (dr.team === shooter.team) continue;
    const t = rayBox(ox, oy, oz, d, dr.x - 0.7, dr.y - 0.3, dr.z - 0.7, dr.x + 0.7, dr.y + 0.3, dr.z + 0.7);
    if (t < best) { best = t; victim = null; drone = dr; }
  }
  const hx = ox + d[0] * best, hy = oy + d[1] * best, hz = oz + d[2] * best;
  s.events.push({
    type: 'shot', id: shooter.id, ox, oy, oz, x: hx, y: hy, z: hz,
    hit: victim ? victim.id : -1, wall: !victim && !drone && !!wall && wall.t <= best + 1e-6,
    nx: wall ? wall.nx : 0, ny: wall ? wall.ny : 1, nz: wall ? wall.nz : 0,
  });
  if (victim) {
    let dmg = w.dmg * (best > w.range ? w.falloff : 1) * (head ? w.head : 1);
    damage(s, victim, dmg, shooter, weaponId, head, ox, oz);
  } else if (drone) {
    drone.hp -= w.dmg;
    s.events.push({ type: 'hit', attacker: shooter.id, victim: -1, dmg: w.dmg, head: false });
    if (drone.hp <= 0 && drone.t > 0) {
      drone.t = 0;
      s.events.push({ type: 'explode', x: drone.x, y: drone.y, z: drone.z, big: false });
      s.events.push({ type: 'feed', text: `${shooter.name} shot down an Attack Drone`, team: shooter.team, by: shooter.id });
    }
  }
}

function damage(s, v, dmg, attacker, weaponId, head, fromX, fromZ) {
  if (!v.alive) return;
  v.hp -= dmg;
  v.lastHurt = s.t;
  v.hurtBy = attacker.id;
  s.events.push({ type: 'hit', attacker: attacker.id, victim: v.id, dmg, head, fromX, fromZ });
  if (v.bot && attacker !== v) {
    v.bot.alertId = attacker.id; v.bot.alertT = s.t;
  }
  if (v.hp <= 0) kill(s, v, attacker, weaponId, head);
}

function kill(s, v, killer, weaponId, head) {
  v.alive = false; v.hp = 0; v.respawn = RESPAWN; v.deaths++; v.streak = 0; v.killedBy = killer.id;
  v.slideT = 0; v.crouch = false;
  const suicide = killer === v;
  if (!suicide) {
    killer.kills++;
    if (head) killer.headshots++;
    if (s.cfg.teams) s.teamScore[killer.team]++;
    if (killer.bot && killer.bot.target === v.id) killer.bot.target = -1;
    if (weaponId !== 'strike' && weaponId !== 'drone') { // streak kills don't chain streaks
      killer.streak++;
      killer.bestStreak = Math.max(killer.bestStreak, killer.streak);
      for (const st of STREAKS) {
        if (killer.streak === st.kills && killer.alive) deployStreak(s, killer, st);
      }
    }
  } else if (!s.cfg.teams) killer.kills = Math.max(0, killer.kills - 1);
  s.events.push({ type: 'kill', killer: killer.id, victim: v.id, weapon: weaponId, head, x: v.x, y: v.y, z: v.z });
  const limit = s.cfg.scoreLimit;
  if (s.cfg.teams ? s.teamScore[killer.team] >= limit : killer.kills >= limit) endMatch(s);
}

function endMatch(s) {
  if (s.over) return;
  s.over = true;
  if (s.cfg.teams) {
    const [a, b] = s.teamScore;
    s.winner = a === b ? -1 : a > b ? 0 : 1;
  } else {
    const ranked = s.players.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    s.winner = ranked[0].team;
  }
  s.events.push({ type: 'end', winner: s.winner });
}

// ---------------------------------------------------------------- scorestreaks

function deployStreak(s, p, st) {
  p.earned.push(st.id);
  s.events.push({ type: 'streak', id: p.id, streak: st.id, name: st.name, team: p.team });
  if (st.id === 'uav') s.uav[p.team] = s.t + 25;
  else if (st.id === 'strike') {
    // aim at the enemy with the most enemies around it
    let best = null, bestN = -1;
    for (const e of s.players) {
      if (!e.alive || !enemies(s, p, e)) continue;
      let n = 0;
      for (const o of s.players) if (o.alive && enemies(s, p, o) && Math.hypot(o.x - e.x, o.z - e.z) < 7) n++;
      if (n > bestN) { bestN = n; best = e; }
    }
    if (!best) return;
    const bombs = [];
    for (let i = 0; i < 6; i++) {
      bombs.push({ x: best.x + (s.rng() - 0.5) * 8, z: best.z + (s.rng() - 0.5) * 8, t: 2.2 + i * 0.18 });
    }
    s.strikes.push({ owner: p.id, team: p.team, x: best.x, z: best.z, bombs, t: 0 });
  } else if (st.id === 'drone') {
    s.drones.push({ owner: p.id, team: p.team, x: p.x, y: 8, z: p.z, t: 20, hp: 160, fireCd: 0, target: -1, lockT: 0, yaw: 0 });
  }
}

function explode(s, x, y, z, owner, weaponId, radius, maxDmg, big) {
  s.events.push({ type: 'explode', x, y, z, big });
  const killer = s.players[owner];
  for (const v of s.players) {
    if (!v.alive) continue;
    if (v !== killer && !enemies(s, killer, v)) continue;
    const cy = v.y + 0.9;
    const d = Math.hypot(v.x - x, cy - y, v.z - z);
    if (d > radius) continue;
    if (!lineOfSight(s.map, x, y + 0.3, z, v.x, cy, v.z) && !lineOfSight(s.map, x, y + 0.3, z, v.x, v.y + 1.6, v.z)) continue;
    const dmg = maxDmg * (1 - d / radius) * (v === killer ? 0.6 : 1) + 10;
    damage(s, v, dmg, killer, weaponId, false, x, z);
  }
}

function updateGrenades(s) {
  for (const g of s.grenades) {
    g.vy -= GRAVITY * DT;
    const nx = g.x + g.vx * DT, nz = g.z + g.vz * DT;
    if (cellHeight(s.map, Math.floor(nx / TILE), Math.floor(g.z / TILE)) > g.y) g.vx *= -0.45; else g.x = nx;
    if (cellHeight(s.map, Math.floor(g.x / TILE), Math.floor(nz / TILE)) > g.y) g.vz *= -0.45; else g.z = nz;
    g.y += g.vy * DT;
    const floor = Math.min(cellHeight(s.map, Math.floor(g.x / TILE), Math.floor(g.z / TILE)), 50);
    if (g.y < floor + 0.08) {
      g.y = floor + 0.08;
      if (g.vy < -1.5) s.events.push({ type: 'bounce', x: g.x, y: g.y, z: g.z });
      g.vy = Math.abs(g.vy) * 0.3; g.vx *= 0.6; g.vz *= 0.6;
    }
    g.fuse -= DT;
    if (g.fuse <= 0) explode(s, g.x, g.y, g.z, g.owner, 'frag', 6.5, 130, false);
  }
  s.grenades = s.grenades.filter((g) => g.fuse > 0);
}

function updateStrikes(s) {
  for (const st of s.strikes) {
    st.t += DT;
    for (const b of st.bombs) {
      if (!b.done && st.t >= b.t) {
        b.done = true;
        explode(s, b.x, Math.min(heightAtSafe(s, b.x, b.z), 6.5), b.z, st.owner, 'strike', 6, 160, true);
      }
    }
  }
  s.strikes = s.strikes.filter((st) => st.bombs.some((b) => !b.done));
}

function heightAtSafe(s, x, z) {
  const h = cellHeight(s.map, Math.floor(x / TILE), Math.floor(z / TILE));
  return h > 20 ? 0.2 : h + 0.2;
}

function updateDrones(s) {
  for (const dr of s.drones) {
    dr.t -= DT;
    const owner = s.players[dr.owner];
    let target = null, bestD = Infinity, visible = false;
    for (const e of s.players) {
      if (!e.alive || !enemies(s, owner, e)) continue;
      const d = Math.hypot(e.x - dr.x, e.z - dr.z);
      const see = lineOfSight(s.map, dr.x, dr.y, dr.z, e.x, e.y + 1.2, e.z);
      const score = d - (see ? 40 : 0);
      if (score < bestD) { bestD = score; target = e; visible = see; }
    }
    if (target) {
      const dx = target.x - dr.x, dz = target.z - dr.z, d = Math.hypot(dx, dz);
      if (d > 4) { dr.x += (dx / d) * 6 * DT; dr.z += (dz / d) * 6 * DT; }
      dr.yaw = Math.atan2(dx, dz);
      dr.fireCd -= DT;
      if (target.id !== dr.target || !visible) { dr.target = target.id; dr.lockT = 0.9; }
      dr.lockT -= DT;
      if (visible && dr.lockT <= 0 && dr.fireCd <= 0) {
        dr.fireCd = 0.22;
        const ty = target.y + 1.1;
        const dist = Math.hypot(dx, ty - dr.y, dz);
        const sp = 0.06;
        const d0 = [dx / dist + (s.rng() - 0.5) * sp, (ty - dr.y) / dist + (s.rng() - 0.5) * sp, dz / dist + (s.rng() - 0.5) * sp];
        const l = Math.hypot(d0[0], d0[1], d0[2]);
        hitscan(s, owner, dr.x, dr.y - 0.4, dr.z, [d0[0] / l, d0[1] / l, d0[2] / l], DRONE_GUN, 'drone');
        s.events.push({ type: 'fire', id: -1, weapon: 'drone', x: dr.x, y: dr.y, z: dr.z });
      }
    }
  }
  s.drones = s.drones.filter((d) => d.t > 0);
}

// ---------------------------------------------------------------- bots

const PREFERRED_RANGE = { kestrel: 9, bulldog: 5, vanguard: 18, hammer: 20, longbow: 34, p9: 10 };

function makeBrain(s) {
  const skill = clamp(s.skill + (s.rng() - 0.5) * 0.3, 0.05, 1);
  return {
    skill, react: 0, target: -1, visible: false, seenT: -99, lastX: 0, lastZ: 0,
    path: [], goal: -1, repath: 0, strafe: 1, strafeT: 0, aimX: 0, aimY: 0, acquireT: 0,
    stuckT: 0, stuckX: 0, stuckZ: 0, stuckN: 0, alertId: -1, alertT: -99, semi: false, headAim: false,
    crouchT: 0, phase: s.rng() * 100, burstT: 0, pauseT: 0, holdT: 0, holdYaw: 0,
  };
}

function resetBrain(b) {
  Object.assign(b, { target: -1, visible: false, path: [], goal: -1, repath: 0, alertId: -1, stuckT: 0, stuckN: 0, holdT: 0 });
}

function turnToward(p, yaw, pitch, rate) {
  const dy = angleDiff(p.yaw, yaw), dp = pitch - p.pitch;
  const max = rate * DT;
  return [clamp(dy, -max, max), clamp(dp, -max, max), Math.abs(dy) + Math.abs(dp)];
}

function botThink(s, p) {
  const b = p.bot, c = emptyControls(), map = s.map;
  const w = weaponOf(p), slot = p.weapons[p.cur], wid = slot.id;
  const ex = p.x, ey = eyeY(p), ez = p.z;

  // perception, at human-like intervals
  b.react -= DT;
  if (b.react <= 0) {
    b.react = lerp(0.32, 0.1, b.skill) + s.rng() * 0.08;
    let best = null, bestD = Infinity;
    for (const e of s.players) {
      if (!e.alive || !enemies(s, p, e)) continue;
      const dx = e.x - ex, dz = e.z - ez, d = Math.hypot(dx, dz);
      if (d > 75) continue;
      const ang = Math.abs(angleDiff(p.yaw, Math.atan2(dx, dz)));
      const heard = s.t - e.lastFire < 0.5 && d < 35;
      const alerted = b.alertId === e.id && s.t - b.alertT < 2.5;
      if (ang > 1.15 && d > 5 && !heard && !alerted && e.id !== b.target) continue;
      if (!lineOfSight(map, ex, ey, ez, e.x, e.y + stanceOf(e).top - 0.5, e.z)) continue;
      const score = d - (e.id === b.target ? 6 : 0);
      if (score < bestD) { bestD = score; best = e; }
    }
    if (best) {
      if (best.id !== b.target) {
        b.target = best.id; b.acquireT = s.t;
        const err = lerp(0.16, 0.03, b.skill);
        b.aimX = (s.rng() - 0.5) * 2 * err; b.aimY = (s.rng() - 0.3) * err;
        b.headAim = s.rng() < b.skill * 0.45;
      }
      b.visible = true; b.seenT = s.t; b.lastX = best.x; b.lastZ = best.z; b.path = []; b.goal = -1;
    } else b.visible = false;
  }

  const target = b.target >= 0 ? s.players[b.target] : null;
  if (target && !target.alive) { b.target = -1; b.visible = false; }

  if (b.target >= 0 && b.visible) {
    // ----- fight
    const t = target;
    const dx = t.x - ex, dz = t.z - ez, dist = Math.hypot(dx, dz);
    const aimY = t.y + (b.headAim ? stanceOf(t).top - 0.14 : stanceOf(t).top * 0.6);
    const decay = Math.exp(-DT * lerp(1.2, 4.5, b.skill));
    b.aimX *= decay; b.aimY *= decay;
    // hands are never perfectly steady: a slow wobble that skill shrinks but never removes
    const wob = lerp(0.07, 0.018, b.skill) * (1 + p.ads * -0.3);
    const ph = s.t * 1.7 + b.phase;
    const yaw = Math.atan2(dx, dz) + b.aimX + Math.sin(ph) * wob + Math.sin(ph * 2.3) * wob * 0.5;
    const pitch = Math.atan2(aimY - ey, dist) + b.aimY + Math.cos(ph * 1.3) * wob * 0.6;
    const [dyaw, dpitch, err] = turnToward(p, yaw, pitch, lerp(3.5, 11, b.skill));
    c.dyaw = dyaw; c.dpitch = dpitch;
    c.ads = dist > 7 && wid !== 'bulldog';
    const reaction = lerp(0.65, 0.22, b.skill) + (w.scope ? 0.45 : 0);
    const aligned = err < Math.max(0.035, 0.9 / Math.max(dist, 1));
    const inRange = wid !== 'bulldog' || dist < 14;
    let shoot = aligned && inRange && s.t - b.acquireT > reaction && (!c.ads || p.ads > (w.scope ? 0.97 : 0.6) || dist < 12);
    if (w.auto) {
      // bursts: hold the trigger for a moment, then let the recoil settle
      if (b.pauseT > 0) { b.pauseT -= DT; shoot = false; }
      else if (shoot) {
        b.burstT += DT;
        if (b.burstT > lerp(0.35, 0.8, b.skill) + s.rng() * 0.3) { b.burstT = 0; b.pauseT = lerp(0.35, 0.15, b.skill); }
      }
    } else { b.semi = !b.semi; shoot = shoot && b.semi && p.fireCd <= 0 && s.rng() < (w.scope ? 0.08 : 0.5); }
    c.fire = shoot;
    b.strafeT -= DT;
    if (b.strafeT <= 0) { b.strafe = s.rng() < 0.5 ? -1 : 1; b.strafeT = 0.35 + s.rng() * 0.9; }
    c.mx = b.strafe * lerp(0.4, 1, b.skill);
    const pref = PREFERRED_RANGE[wid] || 15;
    if (dist > pref * 1.4) c.mz = 1;
    else if (dist < pref * 0.5) c.mz = -0.7;
    b.crouchT -= DT;
    if (b.crouchT <= 0 && s.rng() < 0.02 * b.skill) { c.crouch = true; b.crouchT = 1.5; }
    if (slot.mag === 0 && p.cur === 0 && slot.reserve > 0 && dist < 8 && p.weapons[1].mag > 0) c.swap = true;
    if (c.ads && p.crouch && s.rng() < 0.01) c.crouch = true;
    if (p.nades > 0 && dist > 9 && dist < 25 && s.rng() < 0.0015 * (1 + b.skill)) c.nade = true;
    return c;
  }

  // ----- move: last known position, else hunt
  if (p.crouch && p.slideT <= 0) c.crouch = true; // stand back up
  if (p.cur === 1 && p.swapT <= 0 && p.weapons[0].mag + p.weapons[0].reserve > 0) c.swap = true;
  if (slot.mag < WEAPONS[wid].mag * 0.4 && slot.reserve > 0) c.reload = true;

  // holding an angle: stay put and watch the longest sightline from here
  if (b.holdT > 0) {
    b.holdT -= DT;
    const [dyaw, dpitch] = turnToward(p, b.holdYaw, 0, 4);
    c.dyaw = dyaw; c.dpitch = dpitch;
    if (b.holdT < 1.2) c.mx = Math.sin(s.t * 2 + b.phase) * 0.6; // peek a little before moving on
    return c;
  }

  // chase what we saw or what shot us; otherwise keep the current goal until it is reached
  let chase = -1;
  if (b.target >= 0 && s.t - b.seenT < 5) chase = cellOf(map, b.lastX, b.lastZ);
  else if (b.alertId >= 0 && s.t - b.alertT < 4) {
    const a = s.players[b.alertId];
    chase = cellOf(map, a.x, a.z);
  } else b.target = -1;
  if (chase >= 0 && map.height[chase] === 0 && chase !== b.goal) { b.goal = chase; b.repath = 0; }
  if (b.goal < 0) {
    const hunt = s.uav[p.team] > s.t || s.rng() < 0.35;
    let e = null;
    if (hunt) {
      let bd = Infinity;
      for (const o of s.players) {
        if (!o.alive || !enemies(s, p, o)) continue;
        const d = Math.hypot(o.x - p.x, o.z - p.z) + s.rng() * 20;
        if (d < bd) { bd = d; e = o; }
      }
    }
    let goal = e ? cellOf(map, e.x + (s.rng() - 0.5) * 10, e.z + (s.rng() - 0.5) * 10)
      : map.floor[Math.floor(s.rng() * map.floor.length)];
    if (map.height[goal] > 0) goal = map.floor[Math.floor(s.rng() * map.floor.length)];
    b.goal = goal; b.repath = 0;
  }
  b.repath -= DT;
  if (b.repath <= 0) {
    b.path = findPath(map, cellOf(map, p.x, p.z), b.goal);
    b.repath = 2 + s.rng();
  }
  // skip waypoints we already reached
  while (b.path.length) {
    const [wx, wz] = cellCenter(map, b.path[0]);
    if (Math.hypot(wx - p.x, wz - p.z) < 0.7) b.path.shift(); else break;
  }
  if (!b.path.length) {
    b.goal = -1;
    if (chase < 0 && s.rng() < 0.55) {
      b.holdT = 2 + s.rng() * 4;
      b.holdYaw = longestView(map, p.x, eyeY(p), p.z, s.rng() * Math.PI);
      if (s.rng() < 0.4) c.crouch = !p.crouch;
    }
    return c;
  }
  // aim along the path, looking a couple of cells ahead when the corridor allows it
  let [wx, wz] = cellCenter(map, b.path[0]);
  if (b.path.length > 2) {
    const [ax, az] = cellCenter(map, b.path[2]);
    if (clearWalk(map, p.x, p.z, ax, az)) [wx, wz] = [ax, az];
  }
  const yaw = Math.atan2(wx - p.x, wz - p.z);
  const [dyaw, dpitch] = turnToward(p, yaw, 0, lerp(5, 9, b.skill));
  c.dyaw = dyaw; c.dpitch = dpitch;
  const off = Math.abs(angleDiff(p.yaw + dyaw, yaw));
  c.mz = off < 0.9 ? 1 : 0.25;
  c.sprint = off < 0.4 && b.path.length > 4;

  // unstick
  b.stuckT += DT;
  if (b.stuckT > 1) {
    if (Math.hypot(p.x - b.stuckX, p.z - b.stuckZ) < 0.6) {
      b.stuckN++;
      c.jump = true;
      b.path = [];
      if (b.stuckN > 2) { b.goal = -1; b.stuckN = 0; b.alertId = -1; b.target = -1; }
    } else b.stuckN = 0;
    b.stuckT = 0; b.stuckX = p.x; b.stuckZ = p.z;
  }
  return c;
}

// Direction (yaw) with the longest clear view from a point, sampled in 8 directions.
function longestView(map, x, y, z, offset) {
  let best = offset, bestT = -1;
  for (let i = 0; i < 8; i++) {
    const yaw = offset + (i * Math.PI) / 4;
    const hit = raycast(map, x, y, z, Math.sin(yaw), 0, Math.cos(yaw), 60);
    const t = hit ? hit.t : 60;
    if (t > bestT) { bestT = t; best = yaw; }
  }
  return best;
}

// True when a body can walk straight from a to b without touching a solid cell.
function clearWalk(map, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    for (const [ox, oz] of [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]) {
      if (cellHeight(map, Math.floor((x + ox) / TILE), Math.floor((z + oz) / TILE)) > 0) return false;
    }
  }
  return true;
}

// Standings: TDM sorts within teams, FFA overall.
export function standings(s) {
  return s.players.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.id - b.id);
}

// Whoever is under `p`'s crosshair (any team), for name tags and the red crosshair.
export function aimTarget(s, p, maxT = 120) {
  const d = lookDir(p.yaw, p.pitch), ox = p.x, oy = eyeY(p), oz = p.z;
  const wall = raycast(s.map, ox, oy, oz, d[0], d[1], d[2], maxT);
  let best = wall ? wall.t : maxT, who = null;
  for (const v of s.players) {
    if (!v.alive || v === p) continue;
    const top = v.y + stanceOf(v).top;
    const t = rayBox(ox, oy, oz, d, v.x - 0.4, v.y, v.z - 0.4, v.x + 0.4, top, v.z + 0.4);
    if (t < best) { best = t; who = v; }
  }
  return who;
}
