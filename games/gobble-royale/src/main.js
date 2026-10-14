import { createGame, step, rollPerks, choosePerk, revive, leaderboard, perkLevel, xpNeed, autopilot, DT, ROUND_TIME } from './sim.js';
import { PERKS, SKINS, UPGRADES } from './data.js';
import { Renderer } from './render.js';
import { Audio } from './audio.js';
import { platform } from './platform.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const R = new Renderer(canvas);
const audio = new Audio();

const DEATH_QUIPS = ['Should have run.', 'You were delicious.', 'Snack status: achieved.', 'Big fish, little fish.', 'That was a mouthful.', 'Nom.'];
const LOSE_QUIPS = ['Not the biggest. Yet.', 'Eat faster next time.', 'Bigger mouth needed.', 'The crown is waiting.'];
const PLACE_BONUS = [0, 60, 35, 20, 12, 10, 8, 6, 4, 3, 2, 1, 0];

let save = {
  coins: 0, skin: 'lime', owned: ['lime'], upg: {}, rounds: 0, wins: 0,
  best: { placement: 99, mass: 0, kills: 0 }, sfx: true, music: true, tutorial: true,
};
let S = null;
let mode = 'boot'; // play | perk | paused | dead | results | ad
let acc = 0, last = 0;
let perkOpts = [];
let revived = false, doubled = false, lastAdAt = 0, roundsThisSession = 0;
let lastEarned = 0;
let bannerTimer = null, hudT = 0, deadTimer = null;
let prevRank = 0;
let touchMode = false;
const input = { x: 0, y: 0, dash: false };
const keys = new Set();
const mouse = { x: 0, y: 0, active: false };
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const persist = () => platform.save(save);
const upg = (id) => save.upg[id] || 0;
const skinOf = (id) => SKINS.find((s) => s.id === id) || SKINS[0];

function difficulty() {
  // First round is gentle; bots sharpen as the player plays and wins.
  return Math.max(0.1, Math.min(1, 0.15 + save.rounds * 0.08 + save.wins * 0.12));
}

// ---------- round flow ----------
function startRound() {
  clearTimeout(deadTimer);
  const sk = skinOf(save.skin);
  S = createGame({
    seed: (Math.random() * 2 ** 31) | 0,
    playerName: 'You', skin: sk.id, color: sk.color,
    meta: { startMass: 10 + 3 * upg('start'), dashMul: Math.pow(0.92, upg('dash')) },
    difficulty: difficulty(),
  });
  R.reset();
  revived = false; doubled = false; acc = 0; prevRank = 0;
  hideOverlay();
  mode = 'play';
  audio.setFast(false);
  platform.gameplayStart();
  $('hud').classList.remove('hidden');
  $('xp').classList.remove('hidden');
  setTouchUi();
  updateHud(true);
  if (save.tutorial) {
    showBanner('Eat smaller. Run from bigger!', touchMode ? 'Drag anywhere to move · tap ⚡ to dash' : 'Move the mouse to steer · Space or click to dash');
    setTimeout(() => { if (mode === 'play' && S.t < 12) showBanner('Green ring = snack · Red ring = RUN', 'Be the biggest when the clock hits zero'); }, 5200);
  } else {
    showBanner('Gobble!', 'Be the biggest in 3 minutes');
  }
}

function showBanner(title, hint, ms = 4200) {
  const b = $('banner');
  $('banner-title').textContent = title;
  $('banner-hint').textContent = hint || '';
  b.classList.remove('hidden', 'fade');
  void b.offsetWidth;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.add('fade'), ms);
}

function handleEvents() {
  for (const e of S.events) {
    R.event(e, S);
    switch (e.type) {
      case 'eat':
        if (e.player) {
          if (e.kind === 'gold') audio.play('gold');
          else if (e.kind === 'critter') audio.play('critter');
          else audio.blip(e.combo);
        }
        break;
      case 'kill':
        if (e.eater === S.player.id) audio.play('gulp');
        else if (e.victim !== S.player.id && Math.hypot(e.x - S.player.x, e.y - S.player.y) < 1200) audio.play('farGulp');
        break;
      case 'spike': if (e.player) audio.play('spike'); break;
      case 'spikeEat': if (e.player) audio.play('crunch'); break;
      case 'dash': if (e.id === S.player.id) audio.play('dash'); break;
      case 'levelup': audio.play('levelup'); break;
      case 'frenzy':
        audio.play('frenzy'); audio.setFast(true);
        if (mode === 'play') showBanner('GOLDEN FRENZY!', '30 seconds left · golden snacks everywhere', 3000);
        break;
      case 'playerDead':
        audio.play('dead');
        platform.gameplayStop();
        mode = 'dead';
        deadTimer = setTimeout(() => showDeath(e.by), 1100);
        break;
    }
  }
  S.events.length = 0;
}

function afterStep() {
  if (mode !== 'play') return;
  if (S.player.pendingLevels > 0) { openPerks(); return; }
  if (S.over && S.player.alive) endRound();
}

function endRound() {
  mode = 'results';
  platform.gameplayStop();
  audio.setFast(false);
  const r = S.result;
  if (r.placement === 1) { audio.play('win'); platform.happytime(); } else audio.play('end');
  showResults();
}

// ---------- perks ----------
function openPerks() {
  mode = 'perk';
  perkOpts = rollPerks(S);
  const p = S.player;
  showPanel(`
    <h1>Level ${p.level - p.pendingLevels + 1}!</h1>
    <p class="quip">Pick a power</p>
    <div class="perks">${perkOpts.map((k, i) => `
      <button class="perk" data-perk="${k.id}">
        <span class="ico">${k.icon}</span>
        <span><b>${k.name}</b><div class="d">${k.desc}</div>
        <div class="lv">${perkLevel(p, k.id) ? 'Lv ' + perkLevel(p, k.id) + ' → ' + (perkLevel(p, k.id) + 1) : 'NEW'}</div>
        ${touchMode ? '' : `<kbd>${i + 1}</kbd>`}</span>
      </button>`).join('')}
    </div>`);
  $('panel').querySelectorAll('[data-perk]').forEach((b) => b.addEventListener('click', () => takePerk(b.dataset.perk)));
}

function takePerk(id) {
  if (mode !== 'perk') return;
  choosePerk(S, id);
  audio.play('perk');
  const k = PERKS.find((q) => q.id === id);
  R.say(`${k.icon} ${k.name}!`, S.player.x, S.player.y - S.player.r - 30, '#b48cff', 26, 1.2);
  hideOverlay();
  mode = 'play';
  keys.clear(); input.dash = false;
  afterStep();
}

// ---------- death / results ----------
function showDeath(by) {
  if (mode !== 'dead') return;
  const p = S.player;
  const canRevive = !revived && p.peak >= 25 && S.t < ROUND_TIME - 10;
  showPanel(`
    <h1>Gulped by ${esc(by)}!</h1>
    <p class="quip">${pick(DEATH_QUIPS)}</p>
    <div class="big-rank">#${p.placement}<small> of 12</small></div>
    <div class="btns">
      ${canRevive ? `<button class="btn gold" id="b-revive"><span class="ad-badge">AD</span> Revive</button>` : ''}
      <button class="btn ${canRevive ? '' : 'primary'}" id="b-next">${canRevive ? 'No thanks' : 'Continue'}</button>
    </div>
    ${canRevive ? `<p class="quip">Come back with half your size</p>` : ''}`);
  if (canRevive) $('b-revive').onclick = doRevive;
  $('b-next').onclick = () => { audio.play('click'); mode = 'results'; showResults(); };
}

async function doRevive() {
  if (mode !== 'dead') return;
  mode = 'ad';
  hideOverlay();
  const ok = await runAd('rewarded');
  if (!ok) { mode = 'dead'; showDeath(S.player.killer); return; }
  revived = true;
  revive(S);
  audio.play('revive');
  R.snap = true;
  mode = 'play';
  platform.gameplayStart();
  showBanner('Back for seconds!', 'You are shielded for 3 seconds', 2500);
}

function coinsFor(r) {
  const base = r.peak / 8 + r.kills * 10 + r.gold + PLACE_BONUS[Math.min(12, r.placement)];
  return Math.round(base * (1 + 0.15 * upg('coins')));
}

function showResults() {
  clearTimeout(deadTimer);
  const r = S.result;
  roundsThisSession++;
  save.rounds++;
  if (r.placement === 1) save.wins++;
  lastEarned = coinsFor(r);
  save.coins += lastEarned;
  const rec = [];
  const first = save.rounds === 1;
  if (r.placement < save.best.placement) { save.best.placement = r.placement; if (!first) rec.push('best rank'); }
  if (r.peak > save.best.mass) { save.best.mass = r.peak; if (!first) rec.push('biggest ever'); }
  if (r.kills > save.best.kills) { save.best.kills = r.kills; if (!first) rec.push('most gulps'); }
  if (save.rounds >= 1) save.tutorial = false;
  persist();
  renderResults(rec);
}

function renderResults(rec = []) {
  const r = S.result;
  const win = r.placement === 1;
  const title = win ? 'TOP GOBBLER!' : r.placement <= 3 ? 'So close!' : r.alive ? 'Time\'s up!' : 'Gulped!';
  const sub = win ? 'Biggest monster in the arena' : r.alive ? pick(LOSE_QUIPS) : `Eaten by ${esc(r.killer)}`;
  showPanel(`
    <h1 class="${win ? 'gold' : ''}">${title}</h1>
    <p class="quip">${sub}</p>
    <div class="big-rank">${win ? '👑' : ''}#${r.placement}<small> of 12</small></div>
    <div class="stat-row">
      <div><span>Biggest</span>${r.peak}</div>
      <div><span>Gulps</span>${r.kills}</div>
      <div><span>Level</span>${r.level + 1}</div>
    </div>
    ${rec.length ? `<p style="color:var(--gold);font-weight:700">New record: ${rec.join(', ')}!</p>` : ''}
    <p class="coins" style="margin-top:12px"><i class="coin"></i>+${lastEarned}${doubled ? ' ×2' : ''} <span style="color:var(--muted);font-size:15px;margin-left:6px">(${save.coins} total)</span></p>
    <div class="btns">
      <button class="btn primary" id="b-again">Play again</button>
      ${doubled ? '' : `<button class="btn gold" id="b-double"><span class="ad-badge">AD</span> ×2 coins</button>`}
      <button class="btn" id="b-shop">Shop</button>
    </div>
    ${touchMode ? '' : '<p class="quip" style="margin-top:10px"><kbd>Enter</kbd> play again</p>'}`);
  $('b-again').onclick = playAgain;
  $('b-shop').onclick = () => openShop('skins');
  if (!doubled) $('b-double').onclick = doubleCoins;
}

async function doubleCoins() {
  if (doubled || mode !== 'results') return;
  mode = 'ad';
  const ok = await runAd('rewarded');
  mode = 'results';
  if (ok) {
    doubled = true;
    save.coins += lastEarned;
    persist();
    audio.play('coin');
  }
  renderResults();
}

async function playAgain() {
  if (mode !== 'results' && mode !== 'paused') return;
  audio.play('click');
  // Midgame ad only between rounds, from the third round on, at most every 3 minutes.
  if (roundsThisSession >= 2 && Date.now() - lastAdAt > 180000) {
    mode = 'ad';
    hideOverlay();
    await runAd('midgame');
  }
  startRound();
}

async function runAd(kind) {
  const ok = await platform.ad(kind, {
    onStart: () => { audio.forcedMute = true; audio.apply(); },
    onEnd: () => { audio.forcedMute = platform.muteSetting; audio.apply(); },
  });
  audio.forcedMute = platform.muteSetting; audio.apply();
  lastAdAt = Date.now();
  return ok;
}

// ---------- shop ----------
function openShop(tab) {
  const back = mode;
  mode = 'shop';
  const render = (t) => {
    const body = t === 'skins'
      ? `<div class="skins">${SKINS.map((k) => {
        const owned = save.owned.includes(k.id);
        return `<button class="skin ${save.skin === k.id ? 'on' : ''} ${owned ? '' : 'locked'}" data-skin="${k.id}">
          <canvas width="128" height="128" data-prev="${k.id}"></canvas>
          <span>${k.name}</span>
          ${owned ? `<span class="price" style="color:var(--muted)">${save.skin === k.id ? 'Equipped' : 'Owned'}</span>` : `<span class="price"><i class="coin"></i>${k.price}</span>`}
        </button>`;
      }).join('')}</div>`
      : `<div class="upgrades">${UPGRADES.map((u) => {
        const lv = upg(u.id), maxed = lv >= u.costs.length, cost = u.costs[lv];
        return `<div class="upg"><div class="txt"><b>${u.name}</b><div>${u.desc}</div>
          <div class="pips">${u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="btn ${maxed ? '' : 'gold'}" data-upg="${u.id}" ${maxed || save.coins < cost ? 'disabled' : ''}>${maxed ? 'Max' : `<i class="coin"></i>${cost}`}</button></div>`;
      }).join('')}</div>`;
    showPanel(`
      <button class="close" id="b-close" aria-label="Close">×</button>
      <h1>Shop</h1>
      <p class="coins"><i class="coin"></i>${save.coins}</p>
      <div class="tabs"><button class="tab ${t === 'skins' ? 'on' : ''}" data-tab="skins">Monsters</button><button class="tab ${t === 'upg' ? 'on' : ''}" data-tab="upg">Upgrades</button></div>
      ${body}`, 'wide');
    $('panel').querySelectorAll('[data-prev]').forEach((c) => drawPreview(c, skinOf(c.dataset.prev)));
    $('panel').querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { audio.play('click'); render(b.dataset.tab); });
    $('panel').querySelectorAll('[data-skin]').forEach((b) => b.onclick = () => {
      const k = skinOf(b.dataset.skin);
      if (!save.owned.includes(k.id)) {
        if (save.coins < k.price) { audio.play('tick'); b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; }
        save.coins -= k.price; save.owned.push(k.id); audio.play('coin');
      } else audio.play('click');
      save.skin = k.id; persist(); render(t);
    });
    $('panel').querySelectorAll('[data-upg]').forEach((b) => b.onclick = () => {
      const u = UPGRADES.find((q) => q.id === b.dataset.upg), lv = upg(u.id);
      if (lv >= u.costs.length || save.coins < u.costs[lv]) return;
      save.coins -= u.costs[lv]; save.upg[u.id] = lv + 1; persist(); audio.play('coin'); render(t);
    });
    $('b-close').onclick = () => { audio.play('click'); mode = back; if (back === 'results') renderResults(); else if (back === 'paused') showPause(); };
  };
  render(tab);
}

function drawPreview(c, k) {
  const g = c.getContext('2d');
  const r = 46;
  g.clearRect(0, 0, 128, 128);
  g.save(); g.translate(64, 66);
  const col = k.color === 'rainbow' ? null : k.color;
  if (col) {
    const grd = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    grd.addColorStop(0, '#ffffffaa'); grd.addColorStop(0.3, col); grd.addColorStop(1, col);
    g.fillStyle = grd;
  } else {
    const grd = g.createLinearGradient(-r, -r, r, r);
    ['#ff5a5a', '#ffd84d', '#7dff6b', '#5ad1ff', '#b48cff'].forEach((cc, i) => grd.addColorStop(i / 4, cc));
    g.fillStyle = grd;
  }
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.3)'; g.stroke();
  R.drawFace(g, { dirX: 0.3, dirY: 0.2 }, r, k.face, { gulp: 0, hurt: 0 });
  g.restore();
}

// ---------- pause ----------
function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  platform.gameplayStop();
  showPause();
}

function showPause() {
  showPanel(`
    <h1>Paused</h1>
    <div class="btns">
      <button class="btn primary" id="b-resume">Resume</button>
      <button class="btn" id="b-restart">New round</button>
    </div>
    <div class="settings">
      <button class="btn" id="b-sfx">Sound: ${save.sfx ? 'On' : 'Off'}</button>
      <button class="btn" id="b-music">Music: ${save.music ? 'On' : 'Off'}</button>
    </div>
    <p class="quip" style="margin-top:12px">Wins: ${save.wins} · Best rank: ${save.best.placement < 99 ? '#' + save.best.placement : '–'} · Biggest: ${save.best.mass}</p>`);
  $('b-resume').onclick = resume;
  $('b-restart').onclick = () => { audio.play('click'); startRound(); };
  $('b-sfx').onclick = () => { save.sfx = !save.sfx; audio.sfxOn = save.sfx; audio.apply(); persist(); showPause(); };
  $('b-music').onclick = () => { save.music = !save.music; audio.musicOn = save.music; audio.apply(); persist(); showPause(); };
}

function resume() {
  if (mode !== 'paused') return;
  hideOverlay();
  mode = 'play';
  keys.clear();
  last = performance.now(); acc = 0;
  platform.gameplayStart();
}

// ---------- overlay ----------
function showPanel(html, cls = '') {
  const p = $('panel');
  p.className = 'panel ' + cls;
  p.innerHTML = html;
  $('overlay').classList.remove('hidden');
  const first = p.querySelector('.btn.primary, .perk');
  if (first && !touchMode) first.focus({ preventScroll: true });
}
function hideOverlay() { $('overlay').classList.add('hidden'); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------- HUD ----------
function updateHud(force) {
  const p = S.player;
  const left = Math.max(0, Math.ceil(ROUND_TIME - S.t));
  const tEl = $('hud-time');
  tEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  tEl.classList.toggle('low', left <= 30);
  $('alive').textContent = S.aliveCount;
  const lb = leaderboard(S);
  const rank = p.alive ? lb.indexOf(p) + 1 : p.placement;
  const rEl = $('hud-rank');
  rEl.textContent = '#' + rank;
  rEl.classList.toggle('first', rank === 1);
  if (rank !== prevRank && !force && rank < prevRank) { rEl.classList.remove('bump'); void rEl.offsetWidth; rEl.classList.add('bump'); }
  prevRank = rank;
  $('hud-mass').textContent = Math.round(p.mass) + ' mass';
  const top = lb.slice(0, 5);
  let html = top.map((b, i) => `<li class="${b === p ? 'me' : ''}"><span class="n">${i + 1}. ${esc(b.name)}</span><span>${Math.round(b.mass)}</span></li>`).join('');
  if (p.alive && rank > 5) html += `<li class="sep">⋯</li><li class="me"><span class="n">${rank}. You</span><span>${Math.round(p.mass)}</span></li>`;
  $('board').innerHTML = html;
  $('xp-fill').style.width = Math.min(100, p.xp / xpNeed(p.level + 1) * 100) + '%';
  $('xp-level').textContent = 'Lv ' + (p.level + 1);
  const c = $('combo');
  if (p.combo >= 3) { c.textContent = `x${p.combo} combo`; c.classList.remove('hidden'); } else c.classList.add('hidden');
  const cd = Math.max(0, p.dashCd) / (2.6 * Math.pow(0.78, perkLevel(p, 'dash')) * Math.pow(0.92, upg('dash')));
  $('dash-ring').style.strokeDashoffset = String(289 * Math.min(1, cd));
  $('btn-dash').classList.toggle('cool', cd > 0);
}

function setTouchUi() {
  $('btn-dash').classList.toggle('hidden', !touchMode);
  $('dash-key').classList.toggle('hidden', touchMode || !save.tutorial);
}

// ---------- input ----------
function computeInput() {
  let kx = 0, ky = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ky -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ky += 1;
  if (kx || ky) { const m = Math.hypot(kx, ky); input.x = kx / m; input.y = ky / m; mouse.active = false; return; }
  if (stick.id !== null) {
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
    if (m < 6) { input.x = 0; input.y = 0; return; }
    const mag = Math.min(1, m / 50);
    input.x = dx / m * mag; input.y = dy / m * mag; return;
  }
  if (mouse.active && S) {
    const p = S.player, s = R.cam.s;
    const px = R.w / 2 + (p.x - R.cam.x) * s, py = R.h / 2 + (p.y - R.cam.y) * s;
    const dx = mouse.x - px, dy = mouse.y - py, m = Math.hypot(dx, dy);
    const dead = p.r * s * 0.3;
    if (m < dead) { input.x = 0; input.y = 0; return; }
    const mag = Math.min(1, (m - dead) / (Math.min(R.w, R.h) * 0.12));
    input.x = dx / m * mag; input.y = dy / m * mag; return;
  }
  input.x = 0; input.y = 0;
}

function firstInput() { audio.unlock(); }

window.addEventListener('keydown', (e) => {
  firstInput();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'play') pause(); else if (mode === 'paused') resume(); return; }
  if (mode === 'perk' && /^Digit[123]$/.test(e.code)) { const k = perkOpts[+e.code.slice(5) - 1]; if (k) takePerk(k.id); return; }
  if (mode === 'results' && (e.code === 'Enter' || (e.code === 'Space' && !e.repeat && document.activeElement === document.body))) { e.preventDefault(); playAgain(); return; }
  if (mode === 'play' && e.code === 'Space' && !e.repeat) input.dash = true;
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); if (mode === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pause(); });

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') {
    if (e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; moveKnob(); }
    return;
  }
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
});
canvas.addEventListener('pointerdown', (e) => {
  firstInput();
  if (e.pointerType === 'touch') {
    if (!touchMode) { touchMode = true; setTouchUi(); }
    if (stick.id === null) {
      stick.id = e.pointerId; stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY;
      const el = $('stick'); el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
      el.classList.remove('hidden'); moveKnob();
    }
    return;
  }
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  if (mode === 'play' && e.button === 0) input.dash = true;
});
const endTouch = (e) => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; $('stick').classList.add('hidden');
};
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function moveKnob() {
  const dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy) || 1, k = Math.min(1, 50 / m);
  $('knob').style.transform = `translate(${dx * k}px, ${dy * k}px)`;
}
$('btn-dash').addEventListener('pointerdown', (e) => { e.preventDefault(); firstInput(); if (mode === 'play') input.dash = true; });
$('btn-pause').addEventListener('click', () => { audio.play('click'); pause(); });
window.addEventListener('resize', () => R.resize());
window.addEventListener('touchstart', () => { if (!touchMode) { touchMode = true; setTouchUi(); } }, { passive: true, once: true });
document.addEventListener('pointerdown', firstInput);

// ---------- loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (S) {
    if (mode === 'play' || mode === 'dead') {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 6) {
        if (mode === 'play') {
          computeInput();
          step(S, input);
          input.dash = false;
          handleEvents();
          afterStep();
          if (mode !== 'play') { acc = 0; break; }
        } else {
          S.spectate = true;
          step(S, { x: 0, y: 0 });
          handleEvents();
        }
        acc -= DT; n++;
      }
      if (n >= 6) acc = 0;
    }
    const follow = !S.player.alive ? S.blobs.find((b) => b.alive && b.name === S.player.killer) : null;
    R.draw(S, mode === 'perk' || mode === 'paused' || mode === 'ad' ? 0 : dt, { follow });
    hudT -= dt;
    if (hudT <= 0 && $('hud') && !$('hud').classList.contains('hidden')) { hudT = 0.1; updateHud(); }
  }
}

async function boot() {
  platform.loadingStart();
  await platform.init();
  const loaded = platform.load();
  if (loaded) save = { ...save, ...loaded, best: { ...save.best, ...(loaded.best || {}) }, upg: { ...(loaded.upg || {}) } };
  if (!save.owned.includes(save.skin)) save.skin = 'lime';
  audio.sfxOn = save.sfx; audio.musicOn = save.music;
  audio.forcedMute = platform.muteSetting;
  platform.onSettings((s) => { audio.forcedMute = !!(s && s.muteAudio); audio.apply(); });
  touchMode = matchMedia('(pointer: coarse)').matches;
  try { await document.fonts.load('700 20px Fredoka'); } catch {}
  platform.loadingStop();
  startRound();
  last = performance.now();
  requestAnimationFrame(frame);
}

// For automated tests: let a script read state or drive the player.
window.__gobble = { get S() { return S; }, get mode() { return mode; }, autopilot: (sk) => autopilot(S, S.player, sk) };

boot();
