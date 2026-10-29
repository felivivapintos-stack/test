// The arena: an ASCII grid turned into a height field, plus the geometry queries the
// simulation needs (collision, 3D raycasts, line of sight, grid paths). No DOM.

export const TILE = 2; // metres per grid cell
export const STEP = 0.35; // highest ledge you walk onto without jumping

// '#' wall, 'H' tall building, 'c' crate (blocks), '=' barrier (jump over / crouch behind),
// 'A' team 0 spawn, '.' floor. Only the top half is drawn: the bottom half is the same
// rotated 180° (spawns swapped), so both teams get the same map.
const TOP_HALF = [
  '########################################',
  '#....#......AAAAAAAAAAAA.....#.........#',
  '#....#......AAAAAAAAAAAA.....#....cc...#',
  '#..c.#.......................#....cc...#',
  '#..c....==......HHHH......==...........#',
  '#.......==......HHHH......==......=....#',
  '###..####.......HHHH...........####=.###',
  '#.......#....................c.#.......#',
  '#..cc...#...c.....====.......c.#.......#',
  '#..cc.......c..................#..##...#',
  '#......................HH.........##...#',
  '#####....###.....c....HH....###.......##',
  '#........#.......c..........#..........#',
  '#..==....#..==........==....#....cc....#',
  '#..==.........==....................cc..#',
  '#......cc.............HHH.........#.....#',
  '###....cc....###......HHH....=....#..###',
  '#..............#.............=.........#',
  '#....==........#..cc...................#',
  '#....==.............cc......####.......#',
];

const HEIGHT = { '#': 4, 'H': 6.5, 'c': 1.8, '=': 0.9 };

export function buildMap(rows = TOP_HALF) {
  const w = 40, half = rows.length, h = half * 2;
  const grid = [];
  for (let z = 0; z < half; z++) grid.push((rows[z] + '.'.repeat(w)).slice(0, w).split(''));
  for (let z = 0; z < half; z++) {
    const src = grid[half - 1 - z];
    grid.push(src.slice().reverse().map((ch) => (ch === 'A' ? 'B' : ch)));
  }
  const map = {
    w, h, T: TILE,
    kind: new Array(w * h),
    height: new Float32Array(w * h),
    spawns: [[], []],
    floor: [],
  };
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      let ch = grid[z][x];
      if (x === 0 || z === 0 || x === w - 1 || z === h - 1) ch = '#';
      const i = z * w + x;
      map.kind[i] = ch;
      map.height[i] = HEIGHT[ch] || 0;
      if (ch === 'A') map.spawns[0].push(i);
      if (ch === 'B') map.spawns[1].push(i);
      if (!map.height[i]) map.floor.push(i);
    }
  }
  return map;
}

export function cellHeight(map, cx, cz) {
  if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) return 99;
  return map.height[cz * map.w + cx];
}

export function heightAt(map, x, z) {
  return cellHeight(map, Math.floor(x / TILE), Math.floor(z / TILE));
}

export function cellCenter(map, i) {
  return [(i % map.w + 0.5) * TILE, (Math.floor(i / map.w) + 0.5) * TILE];
}

export function cellOf(map, x, z) {
  const cx = Math.min(map.w - 1, Math.max(0, Math.floor(x / TILE)));
  const cz = Math.min(map.h - 1, Math.max(0, Math.floor(z / TILE)));
  return cz * map.w + cx;
}

// Moves a cylinder of radius r along one axis (0 = x, 2 = z) and pushes it out of any cell
// taller than its feet can step onto.
export function moveAxis(map, b, axis, delta, r) {
  if (!delta) return false;
  if (axis === 0) b.x += delta; else b.z += delta;
  const x0 = Math.floor((b.x - r) / TILE), x1 = Math.floor((b.x + r) / TILE);
  const z0 = Math.floor((b.z - r) / TILE), z1 = Math.floor((b.z + r) / TILE);
  let hit = false;
  for (let cz = z0; cz <= z1; cz++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (cellHeight(map, cx, cz) <= b.y + STEP) continue;
      hit = true;
      if (axis === 0) {
        if (delta > 0) b.x = Math.min(b.x, cx * TILE - r - 1e-4);
        else b.x = Math.max(b.x, (cx + 1) * TILE + r + 1e-4);
      } else if (delta > 0) b.z = Math.min(b.z, cz * TILE - r - 1e-4);
      else b.z = Math.max(b.z, (cz + 1) * TILE + r + 1e-4);
    }
  }
  return hit;
}

// Highest surface under a cylinder that its feet can stand on.
export function groundUnder(map, x, z, feet, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const z0 = Math.floor((z - r) / TILE), z1 = Math.floor((z + r) / TILE);
  let g = 0;
  for (let cz = z0; cz <= z1; cz++) {
    for (let cx = x0; cx <= x1; cx++) {
      const hh = cellHeight(map, cx, cz);
      if (hh <= feet + STEP && hh > g) g = hh;
    }
  }
  return g;
}

// 3D ray against the height field and the ground. Direction must be normalised.
// Returns { t, nx, ny, nz } for the first hit closer than maxT, or null.
export function raycast(map, ox, oy, oz, dx, dy, dz, maxT) {
  let cx = Math.floor(ox / TILE), cz = Math.floor(oz / TILE);
  const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx ? Math.abs(TILE / dx) : Infinity;
  const tDeltaZ = dz ? Math.abs(TILE / dz) : Infinity;
  let tMaxX = dx ? (dx > 0 ? (cx + 1) * TILE - ox : ox - cx * TILE) / Math.abs(dx) : Infinity;
  let tMaxZ = dz ? (dz > 0 ? (cz + 1) * TILE - oz : oz - cz * TILE) / Math.abs(dz) : Infinity;
  const tGround = dy < 0 ? -oy / dy : Infinity;
  const limit = Math.min(maxT, tGround);
  let tEnter = 0, axis = -1;
  while (tEnter < limit) {
    const tExit = Math.min(tMaxX, tMaxZ, limit);
    const inside = cx >= 0 && cz >= 0 && cx < map.w && cz < map.h;
    const hh = inside ? map.height[cz * map.w + cx] : 0;
    if (hh > 0) {
      if (oy + dy * tEnter <= hh) {
        return { t: tEnter, nx: axis === 0 ? -stepX : 0, ny: axis === -1 ? 1 : 0, nz: axis === 2 ? -stepZ : 0 };
      }
      if (dy < 0 && oy + dy * tExit <= hh) return { t: (hh - oy) / dy, nx: 0, ny: 1, nz: 0 };
    }
    if (!inside && ((cx < 0 && dx <= 0) || (cz < 0 && dz <= 0) || (cx >= map.w && dx >= 0) || (cz >= map.h && dz >= 0))) break;
    if (tExit >= limit) break;
    if (tMaxX < tMaxZ) { cx += stepX; tEnter = tMaxX; tMaxX += tDeltaX; axis = 0; }
    else { cz += stepZ; tEnter = tMaxZ; tMaxZ += tDeltaZ; axis = 2; }
  }
  if (tGround <= maxT) return { t: tGround, nx: 0, ny: 1, nz: 0 };
  return null;
}

export function lineOfSight(map, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-3) return true;
  const hit = raycast(map, ax, ay, az, dx / d, dy / d, dz / d, d);
  return !hit || hit.t >= d - 0.05;
}

// Breadth-first path over walkable (height 0) cells, 8 directions without cutting corners.
// Returns the list of cell indices after `from`, ending at `to` (or the closest reachable cell).
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
let prevBuf = null;
export function findPath(map, from, to) {
  const n = map.w * map.h;
  if (!prevBuf || prevBuf.length !== n) prevBuf = new Int32Array(n);
  const prev = prevBuf.fill(-2);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  queue[tail++] = from; prev[from] = -1;
  const [tx, tz] = [to % map.w, Math.floor(to / map.w)];
  let best = from, bestD = Infinity;
  while (head < tail) {
    const i = queue[head++];
    if (i === to) { best = i; break; }
    const x = i % map.w, z = (i - x) / map.w;
    const d = Math.abs(x - tx) + Math.abs(z - tz);
    if (d < bestD) { bestD = d; best = i; }
    for (const [ox, oz] of NB) {
      const nx = x + ox, nz = z + oz;
      if (cellHeight(map, nx, nz) > 0) continue;
      if (ox && oz && (cellHeight(map, x + ox, z) > 0 || cellHeight(map, x, z + oz) > 0)) continue;
      const j = nz * map.w + nx;
      if (prev[j] !== -2) continue;
      prev[j] = i;
      queue[tail++] = j;
    }
  }
  const path = [];
  for (let i = best; i !== from && i >= 0; i = prev[i]) path.push(i);
  return path.reverse();
}
