import { ARENA, canEat, radius } from './sim.js';
import { SKINS, BOT_FACES } from './data.js';

const CRUMB_COLORS = ['#ff6b8b', '#ffd84d', '#5ad1ff', '#7dff6b', '#ff9f43', '#c58bff'];
const TAU = Math.PI * 2;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.cam = { x: ARENA / 2, y: ARENA / 2, s: 1 };
    this.parts = [];
    this.texts = [];
    this.shake = 0;
    this.time = 0;
    this.anim = new Map(); // per blob: { gulp, hurt }
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
  }

  reset() { this.parts.length = 0; this.texts.length = 0; this.anim.clear(); this.shake = 0; this.snap = true; }

  blobAnim(id) {
    let a = this.anim.get(id);
    if (!a) { a = { gulp: 0, hurt: 0 }; this.anim.set(id, a); }
    return a;
  }

  // ---------- effects ----------
  burst(x, y, color, n, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, t: 0, size: size * (0.5 + Math.random()), color });
    }
  }

  say(text, x, y, color = '#fff', size = 22, life = 0.9) {
    this.texts.push({ text, x, y, color, size, life, t: 0 });
    if (this.texts.length > 30) this.texts.shift();
  }

  event(e, S) {
    const p = S.player;
    switch (e.type) {
      case 'eat': {
        if (e.player) {
          this.blobAnim(e.id).gulp = 1;
          const col = e.kind === 'gold' ? '#ffd84d' : CRUMB_COLORS[e.hue % 6];
          if (e.kind !== 'crumb') this.burst(e.x, e.y, col, e.kind === 'gold' ? 14 : 6, 160, 4);
          if (e.kind === 'gold') this.say('GOLDEN!', e.x, e.y - 20, '#ffd84d', 26);
          else if (e.kind === 'critter') this.say('+' + Math.round(e.gain), e.x, e.y - 10, '#fff', 18);
          if (e.combo === 5 || e.combo === 10 || e.combo === 25 || (e.combo >= 50 && e.combo % 50 === 0)) this.say(`x${e.combo} COMBO!`, p.x, p.y - p.r - 26, '#ff9f43', 28, 1.1);
        }
        break;
      }
      case 'kill': {
        this.blobAnim(e.eater).gulp = 1.4;
        this.burst(e.x, e.y, e.color, 26, 320, 7);
        const near = Math.hypot(e.x - p.x, e.y - p.y) < 900 / this.cam.s;
        if (e.eater === p.id) {
          this.say('GULP!', e.x, e.y - 30, '#7dff6b', 40, 1.2);
          this.say(`+${Math.round(e.gain)}  ${e.name}`, e.x, e.y + 14, '#fff', 20, 1.2);
          this.shake = Math.max(this.shake, 14);
        } else if (near) this.shake = Math.max(this.shake, 6);
        break;
      }
      case 'spike':
        this.blobAnim(e.id).hurt = 1;
        this.burst(e.x, e.y, '#9be15d', 12, 260, 5);
        if (e.player) { this.say('OUCH! -' + Math.round(e.lost), e.x, e.y - 40, '#ff6b6b', 28); this.shake = Math.max(this.shake, 12); }
        break;
      case 'spikeEat':
        this.burst(e.x, e.y, '#9be15d', 18, 240, 6);
        if (e.player) this.say('CRUNCH!', e.x, e.y - 30, '#9be15d', 30);
        break;
      case 'dash':
        this.burst(e.x, e.y, 'rgba(255,255,255,0.7)', 8, 120, 5);
        break;
    }
  }

  // ---------- frame ----------
  draw(S, dt, opts = {}) {
    const g = this.g, p = S.player;
    this.time += dt;
    const focus = p.alive || !opts.follow ? p : opts.follow;
    const targetS = Math.min(this.w, this.h) / (520 + focus.r * 7.5) * (this.w < 700 ? 0.9 : 1);
    const k = this.snap ? 1 : 1 - Math.pow(0.02, dt);
    this.cam.x += (focus.x - this.cam.x) * k;
    this.cam.y += (focus.y - this.cam.y) * k;
    this.cam.s += (targetS - this.cam.s) * (this.snap ? 1 : 1 - Math.pow(0.2, dt));
    this.snap = false;
    this.shake *= Math.pow(0.002, dt);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    const s = this.cam.s;
    const vw = this.w / s, vh = this.h / s;
    const left = this.cam.x - vw / 2, top = this.cam.y - vh / 2;
    this.view = { left, top, right: left + vw, bottom: top + vh };

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#17122e';
    g.fillRect(0, 0, this.w, this.h);
    g.setTransform(this.dpr * s, 0, 0, this.dpr * s, this.dpr * (this.w / 2 - this.cam.x * s + sx), this.dpr * (this.h / 2 - this.cam.y * s + sy));

    this.drawFloor(g, S);
    const inView = (x, y, r) => x + r > left && x - r < left + vw && y + r > top && y - r < top + vh;

    for (const f of S.food) {
      if (f.dead || !inView(f.x, f.y, f.r + 4)) continue;
      if (f.kind === 'crumb') this.drawCrumb(g, f);
      else if (f.kind === 'bit') this.drawBit(g, f);
    }
    for (const sp of S.spikes) if (!sp.dead && inView(sp.x, sp.y, sp.r * 1.4)) this.drawSpike(g, sp, p);
    for (const f of S.food) {
      if (f.dead || !inView(f.x, f.y, f.r + 4)) continue;
      if (f.kind === 'critter') this.drawCritter(g, f, p);
      else if (f.kind === 'gold') this.drawGold(g, f);
    }
    const blobs = S.blobs.filter((b) => b.alive).sort((a, b) => a.mass - b.mass);
    const leader = blobs[blobs.length - 1];
    for (const b of blobs) if (inView(b.x, b.y, b.r * 1.3 + 40)) this.drawBlob(g, b, p, b === leader && blobs.length > 1, dt);

    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.t += dt;
      if (q.t >= q.life) { this.parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
      g.globalAlpha = 1 - q.t / q.life;
      g.fillStyle = q.color;
      g.beginPath(); g.arc(q.x, q.y, q.size, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;

    // floating texts (fixed screen size)
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t >= t.life) { this.texts.splice(i, 1); continue; }
      const u = t.t / t.life;
      const pop = u < 0.15 ? 0.6 + u / 0.15 * 0.5 : 1.1 - Math.min(0.1, (u - 0.15));
      g.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      g.font = `700 ${(t.size * pop) / s}px Fredoka, sans-serif`;
      g.lineWidth = 5 / s; g.strokeStyle = 'rgba(20,12,40,0.85)';
      const y = t.y - u * 40 / s;
      g.strokeText(t.text, t.x, y);
      g.fillStyle = t.color; g.fillText(t.text, t.x, y);
    }
    g.globalAlpha = 1;

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (p.alive) this.drawPointers(g, S, blobs, leader);
    if (S.frenzy) {
      const a = 0.12 + 0.08 * Math.sin(this.time * 6);
      const grd = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      grd.addColorStop(0, 'rgba(255,200,60,0)'); grd.addColorStop(1, `rgba(255,170,40,${a})`);
      g.fillStyle = grd; g.fillRect(0, 0, this.w, this.h);
    }
    if (p.alive && p.spikeT > 0.9) {
      g.fillStyle = `rgba(255,60,60,${(p.spikeT - 0.9) * 0.8})`;
      g.fillRect(0, 0, this.w, this.h);
    }
  }

  drawFloor(g, S) {
    const v = this.view;
    // outside the arena
    g.fillStyle = '#0f0b22';
    g.fillRect(v.left - 10, v.top - 10, v.right - v.left + 20, v.bottom - v.top + 20);
    g.fillStyle = '#2a2152';
    g.fillRect(0, 0, ARENA, ARENA);
    // checker tiles
    const T = 160;
    const x0 = Math.max(0, Math.floor(v.left / T)), x1 = Math.min(ARENA / T - 1, Math.floor(v.right / T));
    const y0 = Math.max(0, Math.floor(v.top / T)), y1 = Math.min(ARENA / T - 1, Math.floor(v.bottom / T));
    g.fillStyle = '#30265c';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) g.fillRect(x * T, y * T, T, T);
    g.strokeStyle = '#ff5fa2'; g.lineWidth = 14;
    g.strokeRect(-7, -7, ARENA + 14, ARENA + 14);
    g.strokeStyle = 'rgba(255,95,162,0.25)'; g.lineWidth = 40;
    g.strokeRect(-30, -30, ARENA + 60, ARENA + 60);
  }

  drawCrumb(g, f) {
    g.fillStyle = CRUMB_COLORS[f.hue % 6];
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.35, 0, TAU); g.fill();
  }

  drawBit(g, f) {
    const col = f.color === 'rainbow' ? `hsl(${(f.id * 40) % 360},90%,65%)` : f.color || '#fff';
    g.fillStyle = col;
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2; g.stroke();
  }

  drawCritter(g, f, p) {
    const edible = f.r <= p.r * 0.9;
    const r = f.r, a = Math.atan2(f.vy, f.vx);
    const hueCol = ['#ff8fb1', '#ffd36b', '#8fe3ff', '#a8ff8f', '#ffb27a', '#d6a8ff'][f.hue % 6];
    g.save();
    g.translate(f.x, f.y); g.rotate(a);
    g.globalAlpha = edible ? 1 : 0.55;
    // legs
    const wig = Math.sin(f.t * 18) * 0.35;
    g.strokeStyle = shade(hueCol, -0.4); g.lineWidth = Math.max(2, r * 0.14); g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const lx = i * r * 0.45;
      g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx + Math.sin(wig + i) * r * 0.3, r * 1.0); g.stroke();
      g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx - Math.sin(wig + i) * r * 0.3, -r * 1.0); g.stroke();
    }
    g.fillStyle = hueCol;
    g.beginPath(); g.ellipse(0, 0, r, r * 0.78, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(-r * 0.2, -r * 0.3, r * 0.45, r * 0.22, 0, 0, TAU); g.fill();
    // eyes
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(r * 0.5, -r * 0.3, r * 0.28, 0, TAU); g.arc(r * 0.5, r * 0.3, r * 0.28, 0, TAU); g.fill();
    g.fillStyle = '#1b1035';
    g.beginPath(); g.arc(r * 0.6, -r * 0.3, r * 0.14, 0, TAU); g.arc(r * 0.6, r * 0.3, r * 0.14, 0, TAU); g.fill();
    g.restore();
    g.globalAlpha = 1;
  }

  drawGold(g, f) {
    const r = f.r * 1.1, rot = f.t * 2;
    g.save(); g.translate(f.x, f.y);
    const glow = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2);
    glow.addColorStop(0, 'rgba(255,220,80,0.55)'); glow.addColorStop(1, 'rgba(255,220,80,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 2.2, 0, TAU); g.fill();
    g.rotate(rot);
    g.fillStyle = '#ffd84d'; g.strokeStyle = '#c98a00'; g.lineWidth = r * 0.12;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.48 : r;
      const aa = i / 10 * TAU - Math.PI / 2;
      g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
    }
    g.closePath(); g.fill(); g.stroke();
    g.rotate(-rot);
    g.fillStyle = '#5a3a00';
    g.beginPath(); g.arc(-r * 0.18, -r * 0.05, r * 0.08, 0, TAU); g.arc(r * 0.18, -r * 0.05, r * 0.08, 0, TAU); g.fill();
    g.restore();
  }

  drawSpike(g, s, p) {
    const danger = p.alive && p.mass > 16 && p.mass < s.mass * 1.4;
    const edible = p.mass >= s.mass * 1.4;
    const n = 14, r = s.r;
    g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
    const pulse = danger ? 0.5 + 0.5 * Math.sin(this.time * 5) : 0;
    g.fillStyle = danger ? `rgb(${120 + pulse * 80},${200 - pulse * 60},80)` : '#6fcf4a';
    g.strokeStyle = '#2f6b1f'; g.lineWidth = Math.max(3, r * 0.06);
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 ? r * 0.82 : r * 1.18;
      const aa = i / (n * 2) * TAU;
      g.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
    }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.arc(-r * 0.25, -r * 0.25, r * 0.4, 0, TAU); g.fill();
    g.restore();
    if (edible) {
      g.strokeStyle = 'rgba(125,255,107,0.5)'; g.lineWidth = 4 / this.cam.s; g.setLineDash([10 / this.cam.s, 8 / this.cam.s]);
      g.beginPath(); g.arc(s.x, s.y, r * 1.35, 0, TAU); g.stroke(); g.setLineDash([]);
    }
  }

  drawBlob(g, b, p, isLeader, dt) {
    const a = this.blobAnim(b.id);
    a.gulp = Math.max(0, a.gulp - dt * 3);
    a.hurt = Math.max(0, a.hurt - dt * 2);
    const r = b.r;
    const sp = Math.hypot(b.vx, b.vy);
    const stretch = Math.min(0.16, sp / 1400);
    const ang = Math.atan2(b.vy, b.vx);
    const skin = b.isPlayer ? (SKINS.find((k) => k.id === b.skin) || SKINS[0]) : null;
    let color = b.color;
    if (color === 'rainbow') color = `hsl(${(this.time * 90) % 360},85%,62%)`;
    const base = color.startsWith('#') ? color : null;
    const face = skin ? skin.face : BOT_FACES[parseInt(b.skin.slice(3), 10) % BOT_FACES.length];

    if (b.spawnT > 0 && Math.floor(this.time * 10) % 2 === 0) g.globalAlpha = 0.5;

    // threat ring: red if it can eat you, green if you can eat it
    if (!b.isPlayer && p.alive) {
      const danger = canEat(b, p), prey = canEat(p, b);
      if (danger || prey) {
        g.strokeStyle = danger ? 'rgba(255,70,90,0.8)' : 'rgba(125,255,107,0.7)';
        g.lineWidth = Math.max(3, 4 / this.cam.s);
        g.beginPath(); g.arc(b.x, b.y, r + 6 / this.cam.s + 3, 0, TAU); g.stroke();
      }
    } else if (b.isPlayer) {
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.beginPath(); g.arc(b.x, b.y, r * 1.25 + 10, 0, TAU); g.fill();
    }

    g.save();
    g.translate(b.x, b.y);
    g.rotate(ang);
    const sq = 1 + a.gulp * 0.12;
    g.scale((1 + stretch) * sq, (1 - stretch * 0.8) / Math.sqrt(sq));
    g.rotate(-ang);
    // wobbly jelly body
    const N = 28, t = this.time * 5 + b.id;
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const aa = i / N * TAU;
      const w = 1 + 0.035 * Math.sin(aa * 3 + t) + 0.025 * Math.sin(aa * 5 - t * 1.3) + a.hurt * 0.08 * Math.sin(aa * 9 + t * 4);
      const x = Math.cos(aa) * r * w, y = Math.sin(aa) * r * w;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    const grd = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    grd.addColorStop(0, base ? shade(base, 0.45) : color);
    grd.addColorStop(0.65, color);
    grd.addColorStop(1, base ? shade(base, -0.25) : color);
    g.fillStyle = grd; g.fill();
    g.lineWidth = Math.max(2, r * 0.07); g.strokeStyle = base ? shade(base, -0.4) : 'rgba(0,0,0,0.3)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.beginPath(); g.ellipse(-r * 0.38, -r * 0.45, r * 0.25, r * 0.14, -0.6, 0, TAU); g.fill();
    this.drawFace(g, b, r, face, a);
    g.restore();
    g.globalAlpha = 1;

    if (isLeader) this.drawCrown(g, b.x, b.y - r * 1.02, Math.max(14, r * 0.45));

    // name
    const fs = Math.max(13 / this.cam.s, Math.min(r * 0.38, 34 / this.cam.s));
    g.font = `700 ${fs}px Fredoka, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const ny = r > 40 / this.cam.s ? b.y + r * 0.62 : b.y + r + fs * 0.9;
    g.lineWidth = fs * 0.22; g.strokeStyle = 'rgba(20,12,40,0.8)';
    g.strokeText(b.name, b.x, ny);
    g.fillStyle = b.isPlayer ? '#fff' : !p.alive ? '#e6e1ff' : canEat(b, p) ? '#ffb3bd' : canEat(p, b) ? '#c8ffbe' : '#fff';
    g.fillText(b.name, b.x, ny);
  }

  drawFace(g, b, r, face, a) {
    const lx = b.dirX * r * 0.16, ly = b.dirY * r * 0.16;
    const ex = r * 0.3, ey = -r * 0.12, er = r * 0.2;
    const mouthOpen = a.gulp > 0;
    g.save(); g.translate(lx, ly);
    if (face === 'shades') {
      g.fillStyle = '#16102b';
      g.beginPath(); g.roundRect(-r * 0.62, ey - er * 0.9, r * 0.56, er * 1.6, er * 0.6); g.roundRect(r * 0.06, ey - er * 0.9, r * 0.56, er * 1.6, er * 0.6); g.fill();
      g.fillRect(-r * 0.1, ey - er * 0.6, r * 0.2, er * 0.3);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(-r * 0.52, ey - er * 0.6, r * 0.14, er * 0.3); g.fillRect(r * 0.16, ey - er * 0.6, r * 0.14, er * 0.3);
    } else if (face === 'cyclops') {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, ey, er * 1.5, 0, TAU); g.fill();
      g.fillStyle = '#16102b'; g.beginPath(); g.arc(b.dirX * er * 0.5, ey + b.dirY * er * 0.5, er * 0.75, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.dirX * er * 0.5 - er * 0.25, ey + b.dirY * er * 0.5 - er * 0.25, er * 0.25, 0, TAU); g.fill();
    } else {
      for (const sx of [-1, 1]) {
        const cx = sx * ex;
        if (face === 'sleepy' && !mouthOpen) {
          g.strokeStyle = '#16102b'; g.lineWidth = er * 0.35; g.lineCap = 'round';
          g.beginPath(); g.arc(cx, ey, er * 0.7, 0.2, Math.PI - 0.2); g.stroke();
          continue;
        }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, ey, er, 0, TAU); g.fill();
        if (face === 'star') {
          g.fillStyle = '#ffb000';
          g.beginPath();
          for (let i = 0; i < 10; i++) { const rr = i % 2 ? er * 0.3 : er * 0.75, aa = i / 10 * TAU - Math.PI / 2; g.lineTo(cx + Math.cos(aa) * rr, ey + Math.sin(aa) * rr); }
          g.fill();
        } else {
          g.fillStyle = '#16102b';
          g.beginPath(); g.arc(cx + b.dirX * er * 0.35, ey + b.dirY * er * 0.35, er * 0.55, 0, TAU); g.fill();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(cx + b.dirX * er * 0.35 - er * 0.2, ey + b.dirY * er * 0.35 - er * 0.2, er * 0.18, 0, TAU); g.fill();
        }
        if (face === 'angry') {
          g.strokeStyle = '#16102b'; g.lineWidth = er * 0.35; g.lineCap = 'round';
          g.beginPath(); g.moveTo(cx - sx * er * 1.0, ey - er * 1.35); g.lineTo(cx + sx * er * 0.7, ey - er * 0.85); g.stroke();
        }
      }
    }
    // mouth
    g.fillStyle = '#3a0d2e';
    if (mouthOpen) {
      g.beginPath(); g.ellipse(0, r * 0.3, r * 0.3 * (0.6 + a.gulp * 0.4), r * 0.24 * (0.5 + a.gulp * 0.5), 0, 0, TAU); g.fill();
      g.fillStyle = '#ff7a9a';
      g.beginPath(); g.ellipse(0, r * 0.38, r * 0.15, r * 0.08, 0, 0, TAU); g.fill();
    } else if (a.hurt > 0) {
      g.strokeStyle = '#3a0d2e'; g.lineWidth = r * 0.06; g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 6; i++) g.lineTo(-r * 0.22 + i * r * 0.073, r * 0.3 + (i % 2 ? -1 : 1) * r * 0.04);
      g.stroke();
    } else {
      g.strokeStyle = '#3a0d2e'; g.lineWidth = r * 0.06; g.lineCap = 'round';
      g.beginPath(); g.arc(0, r * 0.18, r * 0.18, 0.25, Math.PI - 0.25); g.stroke();
    }
    g.restore();
  }

  drawCrown(g, x, y, s) {
    g.save(); g.translate(x, y + Math.sin(this.time * 3) * s * 0.06);
    g.fillStyle = '#ffd84d'; g.strokeStyle = '#a86b00'; g.lineWidth = s * 0.1; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-s * 0.8, s * 0.2); g.lineTo(-s * 0.9, -s * 0.55); g.lineTo(-s * 0.4, -s * 0.15); g.lineTo(0, -s * 0.75);
    g.lineTo(s * 0.4, -s * 0.15); g.lineTo(s * 0.9, -s * 0.55); g.lineTo(s * 0.8, s * 0.2); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#ff5fa2';
    g.beginPath(); g.arc(0, -s * 0.05, s * 0.13, 0, TAU); g.fill();
    g.restore();
  }

  // Edge arrows: gold for the leader, red for nearby blobs that can eat you.
  drawPointers(g, S, blobs, leader) {
    const p = S.player, v = this.view, s = this.cam.s;
    const cx = this.w / 2, cy = this.h / 2;
    const arrow = (b, color, label) => {
      const dx = (b.x - this.cam.x) * s, dy = (b.y - this.cam.y) * s;
      const m = 34, hw = this.w / 2 - m, hh = this.h / 2 - m - 20;
      const k = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
      const x = cx + dx * Math.min(1, k), y = cy + dy * Math.min(1, k) + 10;
      const ang = Math.atan2(dy, dx);
      g.save(); g.translate(x, y);
      g.fillStyle = color;
      g.rotate(ang);
      g.beginPath(); g.moveTo(16, 0); g.lineTo(-8, -11); g.lineTo(-3, 0); g.lineTo(-8, 11); g.closePath(); g.fill();
      g.restore();
      if (label) {
        g.font = '700 13px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = color;
        g.fillText(label, x - Math.cos(ang) * 26, y - Math.sin(ang) * 22);
      }
    };
    const off = (b) => b.x + b.r < v.left || b.x - b.r > v.right || b.y + b.r < v.top || b.y - b.r > v.bottom;
    for (const b of blobs) {
      if (b === p || !off(b)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (b === leader) arrow(b, '#ffd84d', '👑');
      else if (canEat(b, p) && d < 1400 / Math.sqrt(s) ) arrow(b, '#ff5a6e');
    }
  }
}

export { radius };
