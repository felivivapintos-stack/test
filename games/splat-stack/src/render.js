import { TILE, COLS, ROWS, W, H, PW, PH, SOLID, SPIKE, LAVA, tileAt, sawPos, doorPos } from './sim.js';

export const WORLDS = [
  { name: 'Jelly Meadow', bg1: '#2b2760', bg2: '#151335', tile: '#5b4fd6', top: '#9d94ff', edge: '#3a31a3', deco: '#ffffff' },
  { name: 'Saw Factory', bg1: '#173847', bg2: '#0b1820', tile: '#2c7a87', top: '#5ee6d2', edge: '#1b4e58', deco: '#bff7ee' },
  { name: 'Lava Works', bg1: '#4a1a1c', bg2: '#1c080a', tile: '#7a3434', top: '#ff9a6b', edge: '#4d1e1e', deco: '#ffd2b8' },
  { name: "Devil's Den", bg1: '#33164a', bg2: '#10061b', tile: '#4b2468', top: '#ff5fb4', edge: '#2c1240', deco: '#ffc2e4' },
];

export const SKINS = [
  { id: 'lime', name: 'Lime', color: '#7dff6b', need: 0 },
  { id: 'bubblegum', name: 'Bubblegum', color: '#ff7ac8', need: 6 },
  { id: 'sky', name: 'Sky', color: '#5cc8ff', need: 12 },
  { id: 'sunny', name: 'Sunny', color: '#ffd23f', need: 20 },
  { id: 'grape', name: 'Grape', color: '#a77bff', need: 28 },
  { id: 'ghost', name: 'Ghost', color: '#eef3ff', need: 36 },
  { id: 'lava', name: 'Magma', color: '#ff5a36', need: 46 },
  { id: 'gold', name: 'Gold', color: '#ffc531', need: 56, shine: true },
  { id: 'rainbow', name: 'Rainbow', color: '#ff5f5f', need: 66, rainbow: true },
];

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function mix(hex, gray, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${(r + (gray - r) * k) | 0},${(g + (gray - g) * k) | 0},${(b + (gray - b) * k) | 0})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function skinColor(skin, t) {
  if (skin.rainbow) return `hsl(${(t * 2) % 360},95%,65%)`;
  return skin.color;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.static = document.createElement('canvas');
    this.static.width = W; this.static.height = H;
    this.particles = [];
    this.texts = [];
    this.shake = 0;
    this.flash = 0;
    this.squash = 1;
    this.blink = 0;
    this.prev = null;
    this.doorAnim = 1;
    this.fallingCrumbles = [];
    this.stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 197) % W, y: (i * 89) % (H - 120), s: 1 + (i % 3), tw: i * 0.7 }));
  }

  // reserveBottom keeps the world clear of on-screen touch buttons.
  resize(cssW, cssH, dpr, reserveBottom = 0, reserveTop = 0) {
    const scale = Math.min(cssW / W, (cssH - reserveBottom - reserveTop) / H);
    this.scale = scale;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.dpr = dpr;
    this.ox = (cssW - W * scale) / 2;
    this.oy = reserveTop + (cssH - reserveTop - reserveBottom - H * scale) / 2;
  }

  setLevel(L, worldIndex) {
    this.L = L;
    this.world = WORLDS[worldIndex % WORLDS.length];
    this.particles.length = 0; this.texts.length = 0; this.fallingCrumbles.length = 0;
    this.prev = null; this.doorAnim = 1;
    this.lava = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (tileAt(L, c, r) === LAVA) this.lava.push({ x: c * TILE, y: r * TILE });
    const g = this.static.getContext('2d');
    g.clearRect(0, 0, W, H);
    const w = this.world;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = tileAt(L, c, r), x = c * TILE, y = r * TILE;
        if (t === SOLID) {
          const open = tileAt(L, c, r - 1) !== SOLID && r > 0;
          const inner = [[0, -1], [0, 1], [-1, 0], [1, 0]].every(([dc, dr]) => { const n = tileAt(L, c + dc, r + dr); return n === SOLID || r + dr >= ROWS; });
          g.fillStyle = inner ? shade(w.tile, -0.28) : w.tile; g.fillRect(x, y, TILE, TILE);
          g.fillStyle = w.edge;
          if ((c + r) % 2 === 0) g.fillRect(x + 6, y + 14, 4, 4);
          if ((c * 7 + r * 3) % 5 === 0) g.fillRect(x + 20, y + 22, 5, 3);
          if (open) {
            g.fillStyle = w.top; rr(g, x - 1, y, TILE + 2, 9, 4); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, y + 2, TILE - 6, 2);
          }
        } else if (t === SPIKE) {
          this.drawSpikes(g, x, y, 1);
        }
      }
    }
  }

  drawSpikes(g, x, y, k) {
    const h = 24 * k;
    for (let i = 0; i < 3; i++) {
      const sx = x + 2 + i * 10;
      g.fillStyle = '#d9dcef';
      g.beginPath(); g.moveTo(sx, y + TILE); g.lineTo(sx + 5, y + TILE - h); g.lineTo(sx + 10, y + TILE); g.closePath(); g.fill();
      g.fillStyle = '#9aa0c3';
      g.beginPath(); g.moveTo(sx + 5, y + TILE); g.lineTo(sx + 5, y + TILE - h); g.lineTo(sx + 10, y + TILE); g.closePath(); g.fill();
      g.fillStyle = '#ff4d5e';
      g.beginPath(); g.moveTo(sx + 3.3, y + TILE - h + 8 * k); g.lineTo(sx + 5, y + TILE - h); g.lineTo(sx + 6.7, y + TILE - h + 8 * k); g.closePath(); g.fill();
    }
  }

  burst(x, y, color, n, speed, grav = 0.35, size = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: 1, decay: 0.02 + Math.random() * 0.025, color, size: size * (0.5 + Math.random()), grav });
    }
  }

  say(text, x, y, color = '#fff', big = false) {
    this.texts.push({ text, x, y, color, life: 1, big });
  }

  onEvents(events, skin, t) {
    const col = skinColor(skin, t);
    for (const e of events) {
      switch (e.type) {
        case 'jump': this.squash = 1.35; this.burst(e.x + PW / 2, e.y + PH, 'rgba(255,255,255,0.6)', 5, 1.5, 0.1, 3); break;
        case 'land': this.squash = 0.65; this.burst(e.x + PW / 2, e.y + PH, 'rgba(255,255,255,0.5)', 6, 1.6, 0.05, 3); break;
        case 'die':
          this.shake = 10; this.flash = 0.35;
          this.burst(e.x + PW / 2, e.y + PH / 2, col, 26, 5, 0.35, 6);
          if (e.cause === 'lava') this.burst(e.x + PW / 2, e.y + PH, '#ffb347', 14, 4, 0.2, 4);
          break;
        case 'pop': this.burst(e.x + 16, e.y + 28, '#ffffff', 8, 2.5, 0.2, 3); this.shake = Math.max(this.shake, 3); break;
        case 'spring': this.squash = 1.5; this.burst(e.x + 16, e.y + 22, '#ffe066', 8, 2.5, 0.15, 3); break;
        case 'crumble': this.fallingCrumbles.push({ x: e.x, y: e.y, vy: 0, life: 60 }); this.burst(e.x + 16, e.y + 16, this.world.tile, 8, 2, 0.3, 4); break;
        case 'shatter': this.burst(e.x + 16, e.y + 28, '#d9dcef', 10, 3, 0.35, 3); break;
        case 'door': this.doorAnim = 0; this.burst(e.x + 16, e.y + 10, '#ffffff', 16, 3, 0.05, 3); break;
        case 'jam': this.burst(e.x, e.y, '#ffe066', 14, 3, 0.25, 3); this.shake = Math.max(this.shake, 4); break;
        case 'thud': this.burst(e.x + PW / 2, e.y, 'rgba(255,255,255,0.35)', 4, 1.2, 0.05, 3); break;
        case 'win': this.burst(e.x + 16, e.y + 8, '#ffe066', 40, 6, 0.2, 5); this.burst(e.x + 16, e.y + 8, col, 30, 5, 0.2, 5); break;
      }
    }
  }

  draw(L, S, skin, alpha, time) {
    const ctx = this.ctx, w = this.world, f = time / 16.67;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = w.bg2;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    let sx = 0, sy = 0;
    if (this.shake > 0.3) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, (this.ox + sx) * this.dpr, (this.oy + sy) * this.dpr);

    // Backdrop
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, w.bg1); grd.addColorStop(1, w.bg2);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = w.deco;
    for (const st of this.stars) {
      ctx.globalAlpha = 0.08 + 0.08 * Math.sin(f * 0.03 + st.tw);
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 230 + f * (0.15 + i * 0.05)) % (W + 300)) - 150;
      ctx.beginPath(); ctx.arc(bx, 120 + i * 70, 60 + i * 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.drawImage(this.static, 0, 0);

    // Lava
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (tileAt(L, c, r) !== LAVA) continue;
        const x = c * TILE, y = r * TILE;
        const lg = ctx.createLinearGradient(0, y + 6, 0, y + TILE);
        lg.addColorStop(0, '#ffcf4a'); lg.addColorStop(0.35, '#ff7a1f'); lg.addColorStop(1, '#c2261b');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(x, y + TILE);
        for (let i = 0; i <= 8; i++) {
          const px = x + (i * TILE) / 8;
          ctx.lineTo(px, y + 9 + Math.sin(f * 0.08 + px * 0.09) * 2.5);
        }
        ctx.lineTo(x + TILE, y + TILE); ctx.closePath(); ctx.fill();
      }
    }

    // Crumbles
    for (let i = 0; i < L.crumbles.length; i++) {
      const st = S.crumble[i];
      if (st === 0) continue;
      const b = L.crumbles[i];
      const j = st > 0 ? (Math.random() - 0.5) * 3 : 0;
      this.drawCrumble(ctx, b.x + j, b.y, st > 0);
    }
    for (const fc of this.fallingCrumbles) {
      ctx.globalAlpha = Math.max(0, fc.life / 60);
      this.drawCrumble(ctx, fc.x, fc.y, true);
      ctx.globalAlpha = 1;
    }

    // Pop spikes
    for (let i = 0; i < L.pops.length; i++) {
      const b = L.pops[i];
      if (S.pop[i]) this.drawSpikes(ctx, b.x, b.y, 1);
    }
    // Springs
    for (const sp of L.springs) {
      ctx.fillStyle = '#5a5f7a'; ctx.fillRect(sp.x + 6, sp.y + 24, 20, 8);
      ctx.strokeStyle = '#c9cde6'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(sp.x + 8, sp.y + 24 - i * 2); ctx.lineTo(sp.x + 24, sp.y + 23 - i * 2); }
      ctx.stroke();
      ctx.fillStyle = '#ffd23f'; rr(ctx, sp.x + 3, sp.y + 14, 26, 6, 3); ctx.fill();
    }
    // Falling spikes
    for (let i = 0; i < L.drops.length; i++) {
      const d = S.drop[i];
      if (d.s === 2) continue;
      const b = L.drops[i], y = b.y + d.y;
      const wob = d.s === 0 ? 0 : 0;
      ctx.fillStyle = '#d9dcef';
      ctx.beginPath(); ctx.moveTo(b.x + 6 + wob, y); ctx.lineTo(b.x + 26 + wob, y); ctx.lineTo(b.x + 16 + wob, y + 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9aa0c3';
      ctx.beginPath(); ctx.moveTo(b.x + 16, y); ctx.lineTo(b.x + 26, y); ctx.lineTo(b.x + 16, y + 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff4d5e';
      ctx.beginPath(); ctx.moveTo(b.x + 13, y + 20); ctx.lineTo(b.x + 19, y + 20); ctx.lineTo(b.x + 16, y + 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a5f7a'; ctx.fillRect(b.x + 4, y - 2, 24, 4);
    }
    // Saws
    for (let si = 0; si < L.saws.length; si++) {
      const saw = L.saws[si], q = sawPos(saw, S.sawT[si]);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(saw.ax, saw.ay); ctx.lineTo(saw.bx, saw.by); ctx.stroke();
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(S.jam[si] ? S.sawT[si] * 0.25 + Math.sin(S.t) * 0.08 : S.sawT[si] * 0.25);
      ctx.fillStyle = '#c9cde6'; ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, rad = i % 2 ? saw.r - 4 : saw.r + 2;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = S.jam[si] ? '#5ee6d2' : '#ff4d5e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, saw.r - 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#7d839f'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2e44'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Door
    const d = doorPos(L, S);
    const shy = L.doorAlt && !S.doorMoved;
    this.drawDoor(ctx, d.x, d.y, f, this.doorAnim, shy);

    // Splats
    for (const sp of S.splats) this.drawSplat(ctx, sp.x, sp.y, skin, f);

    // Player
    const p = S.p;
    if (!p.dead && !S.won) {
      let px = p.x, py = p.y;
      if (this.prev && Math.abs(this.prev.x - p.x) < 40 && Math.abs(this.prev.y - p.y) < 40) {
        px = this.prev.x + (p.x - this.prev.x) * alpha; py = this.prev.y + (p.y - this.prev.y) * alpha;
      }
      this.drawPlayer(ctx, px, py, p, skin, f);
    }

    // Particles
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.life + 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating texts
    for (const tx of this.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 3);
      ctx.font = `800 ${tx.big ? 26 : 17}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,80,80,${this.flash})`; ctx.fillRect(0, 0, W, H);
    }
  }

  // Advances visual effects at a fixed 60 Hz, so they look the same on 60 and 144 Hz screens.
  tick() {
    this.shake = this.shake > 0.3 ? this.shake * 0.86 : 0;
    this.flash *= 0.8;
    for (const lv of this.lava || []) {
      if (Math.random() < 0.004) this.particles.push({ x: lv.x + Math.random() * TILE, y: lv.y + 8, vx: 0, vy: -1.5 - Math.random(), life: 1, decay: 0.03, color: '#ffb347', size: 3, grav: 0.08 });
    }
    this.squash += (1 - this.squash) * 0.18;
    this.doorAnim = Math.min(1, this.doorAnim + 0.06);
    this.blink = this.blink > 0 ? this.blink - 1 : Math.random() < 0.006 ? 8 : 0;
    for (const fc of this.fallingCrumbles) { fc.vy += 0.6; fc.y += fc.vy; fc.life--; }
    this.fallingCrumbles = this.fallingCrumbles.filter((c) => c.life > 0);
    for (const pt of this.particles) { pt.vy += pt.grav; pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.98; pt.life -= pt.decay; }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    for (const tx of this.texts) { tx.life -= 0.012; tx.y -= 0.35; }
    this.texts = this.texts.filter((tx) => tx.life > 0);
  }

  drawCrumble(ctx, x, y, shaking) {
    const w = this.world;
    ctx.fillStyle = shaking ? shade(w.tile, 0.15) : w.tile;
    rr(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 4); ctx.fill();
    ctx.strokeStyle = w.edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 14, y + 14); ctx.lineTo(x + 10, y + 24);
    ctx.moveTo(x + 14, y + 14); ctx.lineTo(x + 26, y + 18); ctx.stroke();
    ctx.fillStyle = w.top; ctx.fillRect(x + 2, y + 1, TILE - 4, 4);
  }

  drawDoor(ctx, x, y, f, k, shy) {
    const e = 1 - Math.pow(1 - k, 3);
    const cx = x + 16, by = y + TILE;
    ctx.save();
    ctx.translate(cx, by); ctx.scale(e, e);
    const glow = 0.5 + 0.2 * Math.sin(f * 0.1);
    ctx.fillStyle = `rgba(255,236,140,${glow * 0.35})`;
    ctx.beginPath(); ctx.ellipse(0, -22, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1d10'; rr(ctx, -15, -46, 30, 46, 13); ctx.fill();
    ctx.fillStyle = '#ffe58a'; rr(ctx, -11, -42, 22, 42, 10); ctx.fill();
    ctx.fillStyle = '#fff6c9'; rr(ctx, -7, -38, 8, 30, 4); ctx.fill();
    if (shy) {
      // A little face that watches you.
      ctx.fillStyle = '#2a1d10';
      ctx.beginPath(); ctx.arc(-4, -26, 2, 0, Math.PI * 2); ctx.arc(4, -26, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8fb1'; ctx.fillRect(-8, -22, 4, 2); ctx.fillRect(4, -22, 4, 2);
    }
    ctx.restore();
  }

  drawPlayer(ctx, x, y, p, skin, f) {
    const col = skinColor(skin, f);
    let sq = this.squash;
    if (!p.ground) sq = Math.max(sq, 1 + Math.min(0.25, Math.abs(p.vy) * 0.015));
    const ws = PW * (2 - sq) * 1.05, hs = PH * sq;
    const cx = x + PW / 2, by = y + PH;
    const wob = p.ground && Math.abs(p.vx) > 0.5 ? Math.sin(f * 0.5) * 1.2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    if (p.ground) { ctx.beginPath(); ctx.ellipse(cx, by, ws * 0.55, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = shade(skin.color, -0.25);
    rr(ctx, cx - ws / 2, by - hs + 2, ws, hs, 8); ctx.fill();
    ctx.fillStyle = col;
    rr(ctx, cx - ws / 2, by - hs + wob, ws, hs - 2, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    rr(ctx, cx - ws / 2 + 3, by - hs + 3 + wob, ws * 0.35, 5, 3); ctx.fill();
    if (skin.shine) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(f * 0.15)})`;
      ctx.fillRect(cx + ws / 2 - 6, by - hs + 4, 2, 6);
    }
    // Eyes
    const look = p.face * 2.5, ey = by - hs * 0.62 + wob;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - 5 + look, ey, 4, this.blink ? 0.8 : 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 5 + look, ey, 4, this.blink ? 0.8 : 4.5, 0, 0, Math.PI * 2); ctx.fill();
    if (!this.blink) {
      ctx.fillStyle = '#1b1530';
      const lookY = Math.max(-1.5, Math.min(1.5, p.vy * 0.15));
      ctx.beginPath(); ctx.arc(cx - 4 + look * 1.3, ey + lookY, 2.1, 0, Math.PI * 2); ctx.arc(cx + 6 + look * 1.3, ey + lookY, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawSplat(ctx, x, y, skin, f) {
    const base = skin.rainbow ? '#c070c0' : skin.color;
    const body = mix(base, 140, 0.45);
    const cx = x + PW / 2;
    ctx.fillStyle = mix(base, 70, 0.5);
    rr(ctx, x - 1, y + 2, PW + 2, PH - 2, 6); ctx.fill();
    ctx.fillStyle = body;
    rr(ctx, x - 1, y, PW + 2, PH - 3, 6); ctx.fill();
    // Drips
    ctx.beginPath(); ctx.arc(x + 4, y + PH - 1, 2.5, 0, Math.PI * 2); ctx.arc(x + PW - 5, y + PH, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 2, y + 2, PW - 4, 2);
    // X eyes
    ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const ex of [cx - 5, cx + 5]) {
      ctx.beginPath(); ctx.moveTo(ex - 2.5, y + 7); ctx.lineTo(ex + 2.5, y + 12); ctx.moveTo(ex + 2.5, y + 7); ctx.lineTo(ex - 2.5, y + 12); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - 3, y + 16); ctx.quadraticCurveTo(cx, y + 14, cx + 3, y + 16); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Draws a skin preview into a small canvas (menus).
  static preview(canvas, skin, locked) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const s = canvas.width / 48;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.globalAlpha = locked ? 0.35 : 1;
    g.fillStyle = shade(skin.color, -0.25); rr(g, 10, 14, 28, 26, 9); g.fill();
    g.fillStyle = skin.rainbow ? 'hsl(330,90%,65%)' : skin.color; rr(g, 10, 12, 28, 26, 9); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, 13, 15, 10, 5, 3); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(19, 23, 4, 5, 0, 0, 7); g.ellipse(29, 23, 4, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#1b1530'; g.beginPath(); g.arc(20, 24, 2.2, 0, 7); g.arc(30, 24, 2.2, 0, 7); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  }

  savePrev(p) { this.prev = { x: p.x, y: p.y }; }
}
