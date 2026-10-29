// WebGL2 renderer. Everything is a lit, untextured box: the static arena is built once,
// soldiers, effects and the first-person weapon are rebuilt every frame.
import { TILE } from './map.js';
import { WEAPONS } from './data.js';
import { stanceOf, eyeY, lookDir } from './sim.js';

const VS = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec3 a_col;
uniform mat4 u_vp;
out vec3 v_col; out vec3 v_nrm; out vec3 v_pos;
void main() { v_col = a_col; v_nrm = a_nrm; v_pos = a_pos; gl_Position = u_vp * vec4(a_pos, 1.0); }`;

const FS = `#version 300 es
precision mediump float;
in vec3 v_col; in vec3 v_nrm; in vec3 v_pos;
uniform vec3 u_eye; uniform vec3 u_sun; uniform vec3 u_fog; uniform float u_fogDen; uniform float u_unlit;
out vec4 o;
void main() {
  vec3 n = normalize(v_nrm);
  float sun = max(dot(n, u_sun), 0.0);
  float hemi = 0.6 + 0.4 * n.y;
  vec3 c = u_unlit > 0.5 ? v_col : v_col * (0.52 * hemi + 0.62 * sun);
  float f = 1.0 - exp(-length(v_pos - u_eye) * u_fogDen);
  o = vec4(mix(c, u_fog, f * (1.0 - 0.6 * u_unlit)), 1.0);
}`;

const SKY = [0.62, 0.7, 0.78];
const SUN = norm([0.45, 0.8, 0.35]);

// Field of view is set horizontally (like most shooters); the projection needs the vertical one.
export function verticalFov(hfovDeg, aspect, maxDeg = 100) {
  const v = 2 * Math.atan(Math.tan((hfovDeg * Math.PI) / 360) / aspect);
  return Math.min(v, (maxDeg * Math.PI) / 180);
}

function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

// ---------------------------------------------------------------- matrices (column-major)
function mat() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function T(x, y, z) { const m = mat(); m[12] = x; m[13] = y; m[14] = z; return m; }
function S(x, y, z) { const m = mat(); m[0] = x; m[5] = y; m[10] = z; return m; }
function RY(a) { const m = mat(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
function RX(a) { const m = mat(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function RZ(a) { const m = mat(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
function chain(...ms) { return ms.reduce((a, b) => mul(a, b)); }
function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}
function lookAt(e, c) {
  let f = norm([c[0] - e[0], c[1] - e[1], c[2] - e[2]]);
  let s = norm([f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]);
  if (!Number.isFinite(s[0])) s = [1, 0, 0];
  const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
  const m = mat();
  m[0] = s[0]; m[4] = s[1]; m[8] = s[2];
  m[1] = u[0]; m[5] = u[1]; m[9] = u[2];
  m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
  m[12] = -(s[0] * e[0] + s[1] * e[1] + s[2] * e[2]);
  m[13] = -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]);
  m[14] = f[0] * e[0] + f[1] * e[1] + f[2] * e[2];
  return m;
}

// ---------------------------------------------------------------- geometry
const FACES = [
  [[1, 0, 0], [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]]],
  [[-1, 0, 0], [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]]],
  [[0, 1, 0], [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]]],
  [[0, -1, 0], [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]]],
  [[0, 0, 1], [[0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]]],
  [[0, 0, -1], [[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]]],
];
const TRI = [0, 1, 2, 0, 2, 3];

class Geo {
  constructor(verts = 8192) { this.a = new Float32Array(verts * 9); this.n = 0; }
  reset() { this.n = 0; }
  vert(x, y, z, nx, ny, nz, r, g, b) {
    if ((this.n + 1) * 9 > this.a.length) {
      const bigger = new Float32Array(this.a.length * 2); bigger.set(this.a); this.a = bigger;
    }
    const a = this.a, o = this.n * 9;
    a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = nx; a[o + 4] = ny; a[o + 5] = nz; a[o + 6] = r; a[o + 7] = g; a[o + 8] = b;
    this.n++;
  }
  // unit cube transformed by m; `ao` darkens the bottom vertices
  box(m, col, ao = 1) {
    for (const [n, vs] of FACES) {
      let nx = m[0] * n[0] + m[4] * n[1] + m[8] * n[2];
      let ny = m[1] * n[0] + m[5] * n[1] + m[9] * n[2];
      let nz = m[2] * n[0] + m[6] * n[1] + m[10] * n[2];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const k of TRI) {
        const v = vs[k], d = v[1] < 0 ? ao : 1;
        this.vert(
          m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
          m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
          m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
          nx, ny, nz, col[0] * d, col[1] * d, col[2] * d,
        );
      }
    }
  }
  // world-space box; `skip` is a bitmask of faces (index in FACES) to leave out
  aabb(x0, y0, z0, x1, y1, z1, col, skip = 0, ao = 1) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
    FACES.forEach(([n, vs], f) => {
      if (skip & (1 << f)) return;
      for (const k of TRI) {
        const v = vs[k], d = v[1] < 0 ? ao : 1, top = v[1] > 0 ? 1 : 0;
        const shade = n[1] ? 1 : d + (1 - d) * top * 0.4;
        this.vert(cx + v[0] * sx, cy + v[1] * sy, cz + v[2] * sz, n[0], n[1], n[2], col[0] * shade, col[1] * shade, col[2] * shade);
      }
    });
  }
  // thin beam between two points
  beam(a, b, w, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-3) return;
    const yaw = Math.atan2(dx, dz), pitch = -Math.asin(dy / len);
    this.box(chain(T((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), RY(yaw), RX(pitch), S(w, w, len)), col);
  }
}

function hash(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- renderer
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;
    this.prog = this.program(VS, FS);
    this.u = {};
    for (const name of ['u_vp', 'u_eye', 'u_sun', 'u_fog', 'u_fogDen', 'u_unlit']) this.u[name] = gl.getUniformLocation(this.prog, name);
    this.staticMesh = this.mesh();
    this.dynMesh = this.mesh();
    this.glowMesh = this.mesh();
    this.vmMesh = this.mesh();
    this.dyn = new Geo(); this.glow = new Geo(); this.vm = new Geo();
    this.scale = Math.min(window.devicePixelRatio || 1, 1.5);
    this.fx = []; // particles
    this.tracers = [];
    this.corpses = [];
    this.anim = new Map(); // per-player walk phase and smoothed eye height
    this.shake = 0;
    this.sway = [0, 0];
    this.kick = 0;
    this.vp = mat();
  }

  program(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  mesh() {
    const gl = this.gl;
    const vao = gl.createVertexArray(), vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 36, i * 12);
    }
    gl.bindVertexArray(null);
    return { vao, vbo, count: 0 };
  }

  upload(mesh, geo, usage) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.a.subarray(0, geo.n * 9), usage);
    mesh.count = geo.n;
  }

  draw(mesh) {
    if (!mesh.count) return;
    const gl = this.gl;
    gl.bindVertexArray(mesh.vao);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  buildMap(map, myTeam) {
    const g = new Geo(60000);
    const W = map.w, H = map.h;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const i = z * W + x, h = map.height[i], k = map.kind[i], r = hash(i);
        const x0 = x * TILE, z0 = z * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
        if (!h) {
          let col = [0.47, 0.47, 0.44];
          if (k === 'A' || k === 'B') {
            const mine = (k === 'A' ? 0 : 1) === myTeam;
            col = mine ? [0.4, 0.47, 0.56] : [0.56, 0.44, 0.4];
          }
          const v = 0.92 + r * 0.1, check = (x + z) & 1 ? 1 : 0.96;
          g.aabb(x0, -0.1, z0, x1, 0, z1, [col[0] * v * check, col[1] * v * check, col[2] * v * check], 0b111011);
          continue;
        }
        const nb = (dx, dz) => {
          const nx = x + dx, nz = z + dz;
          return nx < 0 || nz < 0 || nx >= W || nz >= H ? 99 : map.height[nz * W + nx];
        };
        // hide sides covered by a neighbour at least as tall
        let skip = 1 << 3;
        if (nb(1, 0) >= h) skip |= 1 << 0;
        if (nb(-1, 0) >= h) skip |= 1 << 1;
        if (nb(0, 1) >= h) skip |= 1 << 4;
        if (nb(0, -1) >= h) skip |= 1 << 5;
        const v = 0.9 + r * 0.14;
        if (k === '#') {
          g.aabb(x0, 0, z0, x1, h, z1, [0.6 * v, 0.56 * v, 0.5 * v], skip, 0.6);
          g.aabb(x0 - 0.02, h - 0.25, z0 - 0.02, x1 + 0.02, h + 0.02, z1 + 0.02, [0.5, 0.47, 0.42], skip);
        } else if (k === 'H') {
          g.aabb(x0, 0, z0, x1, h, z1, [0.66 * v, 0.6 * v, 0.52 * v], skip, 0.55);
          g.aabb(x0 - 0.03, 2.6, z0 - 0.03, x1 + 0.03, 3.0, z1 + 0.03, [0.4, 0.38, 0.35], skip | 0b1100);
          if (r > 0.4) g.aabb(x0 + 0.5, 3.6, z0 - 0.05, x1 - 0.5, 4.8, z1 + 0.05, [0.2, 0.26, 0.3], skip | 0b1100);
        } else if (k === 'c') {
          const col = r < 0.5 ? [0.58, 0.44, 0.26] : [0.3, 0.42, 0.3];
          g.aabb(x0 + 0.05, 0, z0 + 0.05, x1 - 0.05, h - 0.01, z1 - 0.05, [col[0] * v, col[1] * v, col[2] * v], 1 << 3, 0.6);
          g.aabb(x0, h - 0.12, z0, x1, h, z1, [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], 1 << 3);
          g.aabb(x0, 0, z0, x1, 0.12, z1, [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6], 1 << 3);
        } else {
          g.aabb(x0, 0, z0, x1, h - 0.08, z1, [0.74 * v, 0.73 * v, 0.7 * v], skip | (1 << 2), 0.6);
          g.aabb(x0, h - 0.08, z0, x1, h, z1, [0.85, 0.65, 0.2], skip);
        }
      }
    }
    // far ground and hills so the sky does not end at the walls
    g.aabb(-200, -0.2, -200, 280, -0.1, 280, [0.42, 0.45, 0.36], 0b111011);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 105 + hash(i + 7) * 30;
      const cx = 40 + Math.cos(a) * d, cz = 40 + Math.sin(a) * d, s = 12 + hash(i + 3) * 18, hh = 8 + hash(i + 11) * 22;
      g.aabb(cx - s, 0, cz - s, cx + s, hh, cz + s, [0.5, 0.56, 0.5], 0, 0.8);
    }
    this.upload(this.staticMesh, g, this.gl.STATIC_DRAW);
  }

  // ---- effects fed by simulation events
  event(e, s, me) {
    if (e.type === 'shot') {
      const shooter = e.id >= 0 ? s.players[e.id] : null;
      let from = [e.ox, e.oy - 0.12, e.oz];
      if (shooter === me) {
        const d = lookDir(me.yaw, me.pitch);
        from = [e.ox + d[0] * 0.8 - Math.cos(me.yaw) * 0.12, e.oy - 0.16, e.oz + d[2] * 0.8 + Math.sin(me.yaw) * 0.12];
      }
      if (shooter !== me || Math.random() < 0.5) this.tracers.push({ a: from, b: [e.x, e.y, e.z], t: 0.05 });
      if (e.hit >= 0) this.burst([e.x, e.y, e.z], [0.7, 0.05, 0.05], 6, 2.5);
      else if (e.wall) this.burst([e.x, e.y, e.z], [0.85, 0.8, 0.6], 4, 3, [e.nx, e.ny, e.nz]);
    } else if (e.type === 'explode') {
      this.burst([e.x, e.y + 0.5, e.z], [1, 0.6, 0.15], e.big ? 30 : 20, e.big ? 12 : 9, null, 0.5, true);
      this.burst([e.x, e.y + 0.5, e.z], [0.3, 0.3, 0.3], 14, 4, [0, 1, 0], 1.4);
      const d = Math.hypot(e.x - me.x, e.z - me.z);
      this.shake = Math.max(this.shake, Math.max(0, 1 - d / (e.big ? 30 : 18)) * 0.8);
    } else if (e.type === 'kill') {
      const v = s.players[e.victim];
      this.corpses.push({ x: e.x, y: e.y, z: e.z, yaw: v.yaw, team: v.team, t: 0, primary: v.weapons[0].id, id: v.id });
    } else if (e.type === 'fire' && e.id === me.id) {
      this.kick = 1;
    }
  }

  burst(p, col, n, speed, dir = null, life = 0.45, glow = false) {
    for (let i = 0; i < n; i++) {
      let v = [Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5];
      if (dir) v = [v[0] + dir[0], v[1] + dir[1], v[2] + dir[2]];
      const l = Math.hypot(v[0], v[1], v[2]) || 1, sp = speed * (0.4 + Math.random() * 0.6);
      this.fx.push({ p: p.slice(), v: [v[0] / l * sp, v[1] / l * sp, v[2] / l * sp], col, t: life * (0.6 + Math.random() * 0.6), life, glow, s: glow ? 0.35 : 0.08 + Math.random() * 0.06 });
    }
  }

  resize() {
    const c = this.canvas, w = Math.floor(c.clientWidth * this.scale), h = Math.floor(c.clientHeight * this.scale);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  // ---- per-frame
  frame(s, me, view, dt) {
    const gl = this.gl;
    this.resize();
    const aspect = this.canvas.width / this.canvas.height;
    this.updateFx(dt);

    // camera
    const st = this.animOf(me, dt);
    let eye, yaw = me.yaw, pitch = me.pitch;
    if (view.camera) ({ eye, yaw, pitch } = view.camera);
    else if (me.alive) eye = [me.x, me.y + st.eye, me.z];
    else {
      // death cam: rise above the body and look at the killer
      const k = s.players[me.killedBy] || me;
      const tt = Math.min(1, (3 - me.respawn) / 0.8);
      eye = [me.x, me.y + 1.6 + tt * 2.5, me.z];
      yaw = Math.atan2(k.x - me.x, k.z - me.z);
      pitch = Math.atan2(k.y + 1.2 - eye[1], Math.hypot(k.x - me.x, k.z - me.z));
    }
    if (this.shake > 0) {
      eye = [eye[0] + (Math.random() - 0.5) * this.shake * 0.3, eye[1] + (Math.random() - 0.5) * this.shake * 0.3, eye[2]];
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    const w = WEAPONS[me.weapons[me.cur].id];
    const zoom = me.alive && !view.camera ? 1 + (w.zoom - 1) * me.ads : 1;
    const fov = verticalFov(view.fov, aspect) / zoom;
    const d = lookDir(yaw, pitch);
    const proj = perspective(fov, aspect, 0.05, 500);
    this.vp = mul(proj, lookAt(eye, [eye[0] + d[0], eye[1] + d[1], eye[2] + d[2]]));
    this.eye = eye;

    // dynamic world geometry
    const dyn = this.dyn, glow = this.glow;
    dyn.reset(); glow.reset();
    const allyCol = [0.24, 0.42, 0.72], enemyCol = [0.72, 0.24, 0.18];
    for (const p of s.players) {
      if (!p.alive || (p === me)) continue;
      const ally = s.cfg.teams && p.team === me.team;
      this.soldier(dyn, glow, p, ally ? allyCol : enemyCol, this.animOf(p, dt));
    }
    for (const c of this.corpses) this.corpse(dyn, c, s.cfg.teams && c.team === me.team ? allyCol : enemyCol);
    for (const g of s.grenades) dyn.box(chain(T(g.x, g.y, g.z), RY(g.x * 3), S(0.12, 0.16, 0.12)), [0.2, 0.3, 0.15]);
    for (const dr of s.drones) {
      const col = s.cfg.teams && dr.team === me.team ? allyCol : enemyCol;
      const base = chain(T(dr.x, dr.y, dr.z), RY(dr.yaw));
      dyn.box(chain(base, S(0.9, 0.35, 1.2)), [0.18, 0.2, 0.22]);
      dyn.box(chain(base, T(0, -0.3, 0.4), S(0.2, 0.25, 0.3)), [0.1, 0.1, 0.1]);
      for (const [ox, oz] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
        dyn.box(chain(base, T(ox, 0.25, oz), RY(s.t * 40), S(0.9, 0.03, 0.1)), col);
      }
      glow.box(chain(base, T(0, -0.2, 0.6), S(0.12, 0.08, 0.05)), [1, 0.2, 0.15]);
    }
    for (const st2 of s.strikes) {
      for (const b of st2.bombs) {
        if (b.done) continue;
        const pulse = 0.6 + 0.4 * Math.sin(s.t * 18);
        glow.aabb(b.x - 0.6, 0.03, b.z - 0.6, b.x + 0.6, 0.06, b.z + 0.6, [1 * pulse, 0.15, 0.1]);
      }
      const jt = st2.t / 2.6, jx = st2.x - 120 + jt * 240;
      dyn.box(chain(T(jx, 30, st2.z), RY(Math.PI / 2), S(2.4, 0.8, 7)), [0.3, 0.32, 0.35]);
      dyn.box(chain(T(jx, 30, st2.z), RY(Math.PI / 2), S(8, 0.2, 2.2)), [0.3, 0.32, 0.35]);
    }
    for (const f of this.fx) {
      const k = f.t / f.life, sz = f.glow ? f.s * (1.5 - k) * 2 : f.s;
      (f.glow ? glow : dyn).box(chain(T(f.p[0], f.p[1], f.p[2]), S(sz, sz, sz)), f.glow ? [f.col[0], f.col[1] * k + 0.2, f.col[2]] : f.col);
    }
    for (const t of this.tracers) glow.beam(t.a, t.b, 0.025, [1, 0.85, 0.45]);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.u_vp, false, this.vp);
    gl.uniform3fv(this.u.u_eye, eye);
    gl.uniform3fv(this.u.u_sun, SUN);
    gl.uniform3fv(this.u.u_fog, SKY);
    gl.uniform1f(this.u.u_fogDen, 0.006);
    gl.uniform1f(this.u.u_unlit, 0);
    this.draw(this.staticMesh);
    this.upload(this.dynMesh, dyn, gl.DYNAMIC_DRAW);
    this.draw(this.dynMesh);
    gl.uniform1f(this.u.u_unlit, 1);
    this.upload(this.glowMesh, glow, gl.DYNAMIC_DRAW);
    this.draw(this.glowMesh);

    // first-person weapon, on top of the world
    const scoped = w.scope && me.ads > 0.9;
    if (me.alive && !scoped && !view.camera) {
      this.viewModel(me, w, view, dt);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(this.u.u_vp, false, perspective(verticalFov(90, aspect, 110), aspect, 0.01, 10));
      gl.uniform3fv(this.u.u_eye, [0, 0, 0]);
      // sun in camera space
      const v = lookAt([0, 0, 0], d);
      gl.uniform3fv(this.u.u_sun, norm([
        v[0] * SUN[0] + v[4] * SUN[1] + v[8] * SUN[2],
        v[1] * SUN[0] + v[5] * SUN[1] + v[9] * SUN[2],
        v[2] * SUN[0] + v[6] * SUN[1] + v[10] * SUN[2],
      ]));
      gl.uniform1f(this.u.u_unlit, 0);
      this.upload(this.vmMesh, this.vm, gl.DYNAMIC_DRAW);
      this.draw(this.vmMesh);
      if (this.vmGlow.n) {
        gl.uniform1f(this.u.u_unlit, 1);
        this.upload(this.glowMesh, this.vmGlow, gl.DYNAMIC_DRAW);
        this.draw(this.glowMesh);
      }
    }
    return scoped;
  }

  animOf(p, dt) {
    let a = this.anim.get(p.id);
    if (!a) { a = { phase: 0, eye: eyeY(p) - p.y, speed: 0 }; this.anim.set(p.id, a); }
    const sp = Math.hypot(p.vx, p.vz);
    a.speed = sp;
    if (p.onGround) a.phase += sp * dt * 1.6;
    const target = stanceOf(p).eye;
    a.eye += (target - a.eye) * Math.min(1, dt * 14);
    return a;
  }

  soldier(g, glow, p, col, a) {
    const st = stanceOf(p), top = st.top;
    const hip = Math.max(0.12, top - 0.95);
    const base = chain(T(p.x, p.y, p.z), RY(p.yaw));
    const pants = [col[0] * 0.45 + 0.12, col[1] * 0.45 + 0.12, col[2] * 0.45 + 0.1];
    const swing = p.onGround ? Math.sin(a.phase) * Math.min(1, a.speed / 5) * 0.7 : 0.4;
    for (const side of [-1, 1]) {
      g.box(chain(base, T(side * 0.11, hip, 0), RX(swing * side), T(0, -hip / 2, 0), S(0.17, hip, 0.2)), pants);
    }
    const lean = p.slideT > 0 ? -0.6 : 0;
    const body = chain(base, T(0, hip, 0), RX(lean));
    g.box(chain(body, T(0, 0.3, 0), S(0.48, 0.62, 0.28)), col);
    g.box(chain(body, T(0, 0.33, -0.15), S(0.4, 0.4, 0.06)), [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6]);
    g.box(chain(body, T(0, 0.74, 0), S(0.26, 0.26, 0.26)), [0.82, 0.66, 0.52]);
    g.box(chain(body, T(0, 0.88, -0.01), S(0.32, 0.12, 0.32)), [col[0] * 0.5, col[1] * 0.5, col[2] * 0.5]);
    g.box(chain(body, T(0, 0.76, 0.12), S(0.2, 0.06, 0.04)), [0.1, 0.1, 0.1]);
    // arms and gun follow the aim
    const w = WEAPONS[p.weapons[p.cur].id];
    const aim = chain(body, T(0, 0.48, 0), RX(-p.pitch - lean));
    g.box(chain(aim, T(0.2, -0.04, 0.22), S(0.12, 0.12, 0.44)), col);
    g.box(chain(aim, T(-0.14, -0.06, 0.3), RY(0.5), S(0.12, 0.12, 0.44)), col);
    g.box(chain(aim, T(0.08, 0, 0.3 + w.len / 2), S(0.08, 0.12, w.len)), w.color);
    if (p.flash > 0) glow.box(chain(aim, T(0.08, 0, 0.35 + w.len), S(0.2, 0.2, 0.25)), [1, 0.8, 0.3]);
  }

  corpse(g, c, col) {
    const fall = Math.min(1, c.t / 0.45) * (Math.PI / 2);
    const base = chain(T(c.x, c.y + 0.1, c.z), RY(c.yaw), RX(-fall));
    g.box(chain(base, T(0, 0.45, 0), S(0.36, 0.85, 0.22)), [col[0] * 0.5 + 0.1, col[1] * 0.5 + 0.1, col[2] * 0.5 + 0.1]);
    g.box(chain(base, T(0, 1.2, 0), S(0.48, 0.65, 0.28)), col);
    g.box(chain(base, T(0, 1.65, 0), S(0.26, 0.26, 0.26)), [0.82, 0.66, 0.52]);
  }

  viewModel(me, w, view, dt) {
    const vm = this.vm; vm.reset();
    this.vmGlow = this.vmGlow || new Geo(256);
    this.vmGlow.reset();
    const a = this.anim.get(me.id);
    const ads = me.ads;
    const moving = me.onGround ? Math.min(1, a.speed / 5) : 0;
    const bobAmp = (me.sprint ? 0.035 : 0.014) * moving * (1 - ads * 0.85);
    const bx = Math.sin(a.phase) * bobAmp, by = -Math.abs(Math.cos(a.phase)) * bobAmp;
    this.sway[0] += (-view.lookDX * 0.0006 - this.sway[0]) * Math.min(1, dt * 10);
    this.sway[1] += (view.lookDY * 0.0006 - this.sway[1]) * Math.min(1, dt * 10);
    this.kick = Math.max(0, this.kick - dt * 12);
    const kick = this.kick * (w.recoil * 2.5 + 0.02) * (1 - ads * 0.5);
    let x = 0.15 * (1 - ads) + bx + this.sway[0] * (1 - ads);
    let y = -0.15 * (1 - ads) - 0.052 * ads + by + this.sway[1] * (1 - ads);
    let z = -0.3 + ads * 0.04 + kick;
    let rx = kick * 3, ry = 0, rz = 0;
    if (me.sprint) { ry = 0.6; rz = 0.3; y -= 0.06; x -= 0.04; }
    if (me.reloadT > 0) {
      const k = Math.sin(Math.min(1, 1 - me.reloadT / w.reload) * Math.PI);
      y -= k * 0.12; rx -= k * 0.5; rz += k * 0.4;
    }
    if (me.swapT > 0) { y -= me.swapT * 0.6; rx -= me.swapT * 1.2; }
    if (me.slideT > 0) { rz += 0.25; }
    const base = chain(T(x, y, z), RX(rx), RY(ry + 0.04 * (1 - ads)), RZ(rz), S(0.72, 0.72, 0.72));
    const L = w.len, c = w.color, dark = [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6];
    const skin = [0.82, 0.66, 0.52], sleeve = [0.24, 0.3, 0.24];
    // receiver, barrel, magazine, stock, sight
    vm.box(chain(base, T(0, 0, -L * 0.25), S(0.06, 0.085, L * 0.55)), c);
    vm.box(chain(base, T(0, 0.012, -L * 0.62), S(0.026, 0.026, L * 0.5)), dark);
    if (w.kind !== 'Shotgun') vm.box(chain(base, T(0, -0.08, -L * 0.22), RX(0.15), S(0.045, 0.12, 0.07)), dark);
    else vm.box(chain(base, T(0, -0.03, -L * 0.55), S(0.06, 0.05, L * 0.3)), [0.4, 0.28, 0.18]);
    if (w.kind !== 'Pistol') vm.box(chain(base, T(0, -0.02, L * 0.12), S(0.05, 0.08, L * 0.25)), dark);
    vm.box(chain(base, T(0, 0.06, -L * 0.2), S(0.02, 0.03, 0.06)), [0.08, 0.08, 0.08]);
    if (w.scope) vm.box(chain(base, T(0, 0.08, -L * 0.25), S(0.05, 0.05, 0.26)), [0.08, 0.08, 0.08]);
    // hands
    vm.box(chain(base, T(0.0, -0.06, 0.02), S(0.07, 0.09, 0.08)), skin);
    vm.box(chain(base, T(0.02, -0.08, 0.2), RX(0.3), S(0.09, 0.09, 0.3)), sleeve);
    vm.box(chain(base, T(-0.02, -0.05, -L * 0.45), S(0.07, 0.06, 0.09)), skin);
    vm.box(chain(base, T(-0.1, -0.12, -L * 0.2), RY(-0.5), RX(0.25), S(0.09, 0.09, 0.4)), sleeve);
    if (me.flash > 0) {
      const f = 0.08 + Math.random() * 0.05;
      this.vmGlow.box(chain(base, T(0, 0.012, -L * 0.9), RZ(Math.random() * 3), S(f, f, f * 1.5)), [1, 0.85, 0.4]);
    }
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.t -= dt;
      f.v[1] -= (f.glow ? -1 : 9) * dt;
      f.p[0] += f.v[0] * dt; f.p[1] += f.v[1] * dt; f.p[2] += f.v[2] * dt;
      if (f.p[1] < 0.02) { f.p[1] = 0.02; f.v[0] *= 0.5; f.v[2] *= 0.5; f.v[1] = 0; }
    }
    this.fx = this.fx.filter((f) => f.t > 0);
    if (this.fx.length > 600) this.fx.splice(0, this.fx.length - 600);
    for (const t of this.tracers) t.t -= dt;
    this.tracers = this.tracers.filter((t) => t.t > 0);
    for (const c of this.corpses) c.t += dt;
    this.corpses = this.corpses.filter((c) => c.t < 3);
  }

  // world point -> CSS pixels, or null when behind the camera
  project(x, y, z) {
    const m = this.vp;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    return [(cx / cw * 0.5 + 0.5) * this.canvas.clientWidth, (0.5 - cy / cw * 0.5) * this.canvas.clientHeight];
  }
}
