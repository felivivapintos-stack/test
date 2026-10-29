// Game data: weapons, scorestreaks, levels, bot names. No logic here.

// range: metres before damage drops to `falloff` of its value.
// spread: radians (hip / aiming down sights). recoil: radians of pitch kick per shot.
export const WEAPONS = {
  vanguard: {
    name: 'M7 Vanguard', kind: 'Assault rifle', slot: 0, unlock: 1, auto: true,
    dmg: 28, head: 1.5, rpm: 700, mag: 30, reserve: 150, reload: 2.1,
    range: 32, falloff: 0.72, hip: 0.05, ads: 0.006, recoil: 0.011, adsTime: 0.22, zoom: 1.35, move: 0.95,
    color: [0.22, 0.24, 0.26], len: 0.75,
  },
  kestrel: {
    name: 'Kestrel SMG', kind: 'SMG', slot: 0, unlock: 1, auto: true,
    dmg: 22, head: 1.4, rpm: 920, mag: 32, reserve: 192, reload: 1.8,
    range: 16, falloff: 0.65, hip: 0.032, ads: 0.013, recoil: 0.008, adsTime: 0.16, zoom: 1.2, move: 1.06,
    color: [0.16, 0.17, 0.2], len: 0.5,
  },
  bulldog: {
    name: 'Bulldog 12', kind: 'Shotgun', slot: 0, unlock: 2, auto: false, pellets: 8,
    dmg: 16, head: 1.25, rpm: 75, mag: 6, reserve: 36, reload: 2.6,
    range: 8, falloff: 0.35, hip: 0.07, ads: 0.05, recoil: 0.05, adsTime: 0.2, zoom: 1.15, move: 1.0,
    color: [0.35, 0.24, 0.16], len: 0.8,
  },
  longbow: {
    name: 'Longbow .338', kind: 'Sniper', slot: 0, unlock: 3, auto: false,
    dmg: 105, head: 2.0, rpm: 48, mag: 5, reserve: 30, reload: 3.0,
    range: 200, falloff: 1, hip: 0.14, ads: 0, recoil: 0.07, adsTime: 0.36, zoom: 4, move: 0.88, scope: true,
    color: [0.24, 0.27, 0.2], len: 1.05,
  },
  hammer: {
    name: 'Hammer LMG', kind: 'LMG', slot: 0, unlock: 5, auto: true,
    dmg: 30, head: 1.4, rpm: 640, mag: 75, reserve: 225, reload: 4.4,
    range: 36, falloff: 0.75, hip: 0.07, ads: 0.011, recoil: 0.01, adsTime: 0.34, zoom: 1.35, move: 0.84,
    color: [0.28, 0.27, 0.22], len: 0.95,
  },
  p9: {
    name: 'P9 Sidearm', kind: 'Pistol', slot: 1, unlock: 1, auto: false,
    dmg: 32, head: 1.6, rpm: 420, mag: 12, reserve: 72, reload: 1.4,
    range: 14, falloff: 0.7, hip: 0.03, ads: 0.01, recoil: 0.02, adsTime: 0.12, zoom: 1.15, move: 1.1,
    color: [0.12, 0.12, 0.13], len: 0.28,
  },
};

export const PRIMARIES = ['vanguard', 'kestrel', 'bulldog', 'longbow', 'hammer'];

// Kills in a row (without dying) needed for each streak. Deployed automatically.
export const STREAKS = [
  { id: 'uav', kills: 3, name: 'UAV', desc: 'Enemies appear on the minimap for 25 s' },
  { id: 'strike', kills: 5, name: 'Air Strike', desc: 'Bombs the biggest group of enemies' },
  { id: 'drone', kills: 7, name: 'Attack Drone', desc: 'A drone hunts enemies for 20 s' },
];

export const MODES = {
  tdm: { name: 'Team Deathmatch', short: 'TDM', teams: true, players: 12, scoreLimit: 75, time: 360 },
  ffa: { name: 'Free-for-All', short: 'FFA', teams: false, players: 8, scoreLimit: 30, time: 360 },
};

export const DIFFICULTY = [
  { name: 'Recruit', skill: 0.25 },
  { name: 'Regular', skill: 0.5 },
  { name: 'Veteran', skill: 0.8 },
];

export const XP = { kill: 100, head: 50, streak: 150, win: 500, match: 250, perScore: 0 };

// Total XP needed to reach `level` (level 1 = 0 XP).
export function xpForLevel(level) {
  return 600 * (level - 1) * level / 2 + 400 * (level - 1);
}
export function levelForXp(xp) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

export const BOT_NAMES = [
  'Ghost_Rider', 'xNovaX', 'Sgt.Pepper', 'Wraith', 'Kilo9', 'Viper', 'Maverick', 'Nomad', 'Reaper77',
  'Bishop', 'Havoc', 'Onyx', 'Specter', 'Torque', 'Raptor', 'Jinx', 'Blitz', 'Echo-1', 'Rook',
  'Sable', 'Comet', 'Mako', 'Dusty', 'Vandal', 'Hex', 'Juno', 'Cypher', 'Riptide',
];
