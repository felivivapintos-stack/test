// Plays bot-only matches without a browser and fails on anything broken:
// NaN positions, bodies inside walls, unreachable floor, matches that never end, dead weapons.
// Usage: node tools/test.mjs [matches] [difficulty 0..1]
import { createMatch, step, DT } from '../src/sim.js';
import { buildMap, cellHeight, findPath, TILE } from '../src/map.js';
import { WEAPONS } from '../src/data.js';

const matches = Number(process.argv[2] || 4);
const difficulty = Number(process.argv[3] ?? 0.5);
let failed = false;
const fail = (msg) => { failed = true; console.error('FAIL:', msg); };

// map: every floor cell reachable from team 0's spawn
const map = buildMap();
{
  const from = map.spawns[0][0];
  const reach = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const i = queue.shift(), x = i % map.w, z = Math.floor(i / map.w);
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (z + oz) * map.w + x + ox;
      if (!reach.has(j) && cellHeight(map, x + ox, z + oz) === 0) { reach.add(j); queue.push(j); }
    }
  }
  const lost = map.floor.filter((i) => !reach.has(i));
  if (lost.length) fail(`${lost.length} floor cells unreachable, e.g. cell ${lost[0] % map.w},${Math.floor(lost[0] / map.w)}`);
  if (!map.spawns[0].length || map.spawns[0].length !== map.spawns[1].length) fail('spawns are not symmetric');
  const p = findPath(map, map.spawns[0][0], map.spawns[1][0]);
  if (p[p.length - 1] !== map.spawns[1][0]) fail('no path between the spawns');
}

const weaponKills = {};
for (const mode of ['tdm', 'ffa']) {
  for (let m = 0; m < matches; m++) {
    const s = createMatch({ mode, seed: 1000 + m, difficulty });
    let steps = 0, shots = 0, hits = 0, fires = 0, nades = 0, streaks = 0, explosions = 0;
    const kills = [];
    const maxSteps = (s.cfg.time + 5) / DT;
    while (!s.over && steps < maxSteps) {
      step(s, null);
      steps++;
      for (const e of s.events) {
        if (e.type === 'fire') fires++;
        if (e.type === 'shot' && e.id >= 0) shots++;
        if (e.type === 'hit' && e.victim >= 0 && e.dmg < 100 && s.players[e.attacker].weapons) hits++;
        if (e.type === 'throw') nades++;
        if (e.type === 'streak') streaks++;
        if (e.type === 'explode') explosions++;
        if (e.type === 'kill') {
          kills.push(e);
          weaponKills[e.weapon] = (weaponKills[e.weapon] || 0) + 1;
        }
      }
      s.events.length = 0;
      if (steps % 30) continue;
      for (const p of s.players) {
        if (![p.x, p.y, p.z, p.yaw, p.pitch, p.hp].every(Number.isFinite)) { fail(`NaN on ${p.name}`); break; }
        if (!p.alive) continue;
        const h = cellHeight(map, Math.floor(p.x / TILE), Math.floor(p.z / TILE));
        if (h > p.y + 0.4) fail(`${p.name} inside a wall at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
      }
      if (failed) break;
    }
    if (!s.over) fail(`${mode} match ${m} never ended`);
    const secs = steps * DT;
    const kpm = kills.length / (secs / 60);
    const top = s.players.slice().sort((a, b) => b.kills - a.kills)[0];
    const score = s.cfg.teams ? `${s.teamScore[0]}-${s.teamScore[1]}` : `${top.name} ${top.kills}`;
    console.log(
      `${mode} #${m}: ${secs.toFixed(0)}s, score ${score}, ${kills.length} kills (${kpm.toFixed(1)}/min),`,
      `${kills.filter((k) => k.head).length} heads, ${fires} shots, ${(100 * hits / shots).toFixed(0)}% acc, ${nades} nades, ${streaks} streaks, ${explosions} booms,`,
      `best streak ${Math.max(...s.players.map((p) => p.bestStreak))}`,
    );
    if (kpm < 4) fail(`${mode} #${m}: too few kills (${kpm.toFixed(1)}/min), bots are not finding each other`);
    const idle = s.players.filter((p) => p.kills + p.deaths === 0);
    if (idle.length) fail(`${idle.map((p) => p.name).join(', ')} never fought`);
    if (failed) break;
  }
}
console.log('kills by weapon:', Object.entries(weaponKills).map(([k, v]) => `${WEAPONS[k] ? WEAPONS[k].name : k} ${v}`).join(', '));
if (failed) process.exit(1);
console.log('OK');
