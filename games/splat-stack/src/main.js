import { LEVELS } from './levels.js';
import { parseLevel, createState, step } from './sim.js';
import { Renderer, SKINS, WORLDS } from './render.js';
import { Audio } from './audio.js';
import { platform } from './platform.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const R = new Renderer(canvas);
const audio = new Audio();
const DT = 1000 / 60;
const LEVELS_PER_WORLD = 6;

const QUIPS = {
  spike: ['Pointy. Who knew.', 'Ouch. But structurally sound.', 'Spikes 1, you 0. You 1 next time.'],
  lava: ['Medium rare.', 'Lava: 1. Bridge: started.', 'A warm welcome.'],
  saw: ['Sliced. Diced. Useful.', 'That blade had a schedule.', 'Bad timing, good platform.'],
  drop: ['Should have looked up.', 'Sky delivery!', 'Special delivery: pain.'],
  void: ['Gone. Not even a splat.', 'Fell for it. Literally.'],
  any: ['Thanks for the bridge.', 'Your sacrifice is noted.', 'You make a lovely floor.', 'Step 1: die. Step 2: climb.', 'Another brick in the wall.', 'Recycling: 100%.', 'Future you says thanks.', 'Squish!'],
};
const WIN_QUIPS = ['Nailed it.', 'Smooth jelly.', 'The door has accepted you.', 'Look at you, alive!', 'Stacked and cracked.'];

let save = { unlocked: 1, stars: [], best: [], bestTime: [], skin: 'lime', sfx: true, music: true, totalDeaths: 0 };
let levelIndex = 0, L = null, S = null;
let mode = 'boot'; // play | paused | complete | menu | ad
let acc = 0, last = 0, fxAcc = 0;
let completions = 0, lastAdAt = 0;
let bannerTimer = null;
let overlayShownAt = 0, advancing = false;
let completeTimer = null, newRecord = false;
const input = { l: false, r: false, j: false };
const keys = { l: new Set(), r: new Set(), j: new Set() };

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function skin() { return SKINS.find((s) => s.id === save.skin) || SKINS[0]; }
function totalStars() { return save.stars.reduce((a, b) => a + (b || 0), 0); }
function persist() { platform.save(save); }
function starsFor(deaths, par) { return deaths <= par ? 3 : deaths <= par + 3 ? 2 : 1; }

// ---------- Level flow ----------
function startLevel(i, { banner = true } = {}) {
  clearTimeout(completeTimer);
  lastComplete = null;
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, i));
  L = parseLevel(LEVELS[levelIndex]);
  S = createState(L);
  R.setLevel(L, Math.floor(levelIndex / LEVELS_PER_WORLD));
  acc = 0;
  hideOverlay();
  mode = 'play';
  platform.gameplayStart();
  updateHud();
  const controls = touchMode ? 'Arrows move, the big button jumps.' : '← → move, ↑ or Space jumps.';
  const hint = levelIndex === 0 ? `${controls} ${L.hint}` : L.hint;
  if (banner) showBanner(`${levelIndex + 1}. ${L.name}`, hint);
}

function restart() {
  if (!L) return;
  clearTimeout(completeTimer);
  if (mode === 'complete') { startLevel(levelIndex, { banner: false }); return; }
  S = createState(L);
  R.setLevel(L, Math.floor(levelIndex / LEVELS_PER_WORLD));
  acc = 0;
  updateHud();
  audio.play('click');
}

function showBanner(title, hint) {
  const b = $('banner');
  $('banner-title').textContent = title;
  $('banner-hint').textContent = hint;
  b.classList.remove('hidden', 'fade');
  void b.offsetWidth;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.add('fade'), 4200);
}

function updateHud() {
  const world = WORLDS[Math.floor(levelIndex / LEVELS_PER_WORLD)];
  $('hud-level').textContent = `${world.name} · ${levelIndex + 1}`;
  $('deaths').textContent = S.deaths;
  $('par').textContent = `par ${L.par}`;
  $('hud-deaths').style.color = S.deaths > L.par ? '#ffb3b3' : '#fff';
  const stuck = S.deaths >= Math.max(8, L.par + 6) && levelIndex < LEVELS.length - 1 && !S.won;
  $('btn-skip').classList.toggle('hidden', !stuck);
}

function bumpDeaths() {
  const el = $('hud-deaths');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function handleEvents(events) {
  for (const e of events) {
    switch (e.type) {
      case 'die':
        audio.play(e.cause === 'lava' ? 'lava' : 'die');
        save.totalDeaths++;
        persist();
        bumpDeaths();
        R.say(pick(Math.random() < 0.5 ? QUIPS[e.cause] || QUIPS.any : QUIPS.any), e.x + 11, Math.max(40, e.y - 12));
        updateHud();
        break;
      case 'jump': case 'land': case 'pop': case 'spring': case 'crumble': case 'shake': case 'drop': case 'shatter': case 'bonk': case 'thud': case 'respawn':
        audio.play(e.type);
        break;
      case 'door': {
        audio.play('door');
        const d = L.doorAlt || L.door;
        R.say('Nope!', d.x + 16, d.y - 30, '#ffe58a', true);
        break;
      }
      case 'jam':
        audio.play('jam');
        R.say('Jammed!', e.x, e.y - 56, '#9ff7ea', true);
        break;
      case 'win':
        audio.play('win');
        break;
    }
  }
  R.onEvents(events, skin(), performance.now() / 16.67);
}

function onWin() {
  mode = 'complete';
  platform.gameplayStop();
  const stars = starsFor(S.deaths, L.par);
  const prev = save.stars[levelIndex] || 0;
  save.stars[levelIndex] = Math.max(prev, stars);
  save.best[levelIndex] = save.best[levelIndex] == null ? S.deaths : Math.min(save.best[levelIndex], S.deaths);
  const secs = S.t / 60;
  const prevTime = save.bestTime[levelIndex];
  newRecord = prevTime != null && secs < prevTime;
  save.bestTime[levelIndex] = prevTime == null ? secs : Math.min(prevTime, secs);
  const starsBefore = totalStars() - save.stars[levelIndex] + prev;
  const skinUnlocked = SKINS.some((k) => k.need > starsBefore && k.need <= totalStars());
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIndex + 2));
  persist();
  completions++;
  if (skinUnlocked || (levelIndex + 1) % LEVELS_PER_WORLD === 0) platform.happytime();
  completeTimer = setTimeout(() => { if (mode === 'complete') showComplete(stars, prev); }, 650);
}

async function goNext() {
  if (advancing) return;
  advancing = true;
  try { await advance(); } finally { advancing = false; }
}

async function advance() {
  const next = levelIndex + 1;
  if (next >= LEVELS.length) { showEnd(); return; }
  // Natural break between levels; the platform decides whether an ad actually runs.
  if (levelIndex >= 2 && completions >= 2 && Date.now() - lastAdAt > 120000) {
    completions = 0;
    await runAd('midgame');
  }
  startLevel(next);
}

async function runAd(kind) {
  const prevMode = mode;
  mode = 'ad';
  const ok = await platform.ad(kind, {
    onStart: () => { audio.forcedMute = true; audio.apply(); },
    onEnd: () => {},
  });
  lastAdAt = Date.now();
  applyAudio({ adPlaying: false });
  if (audio.ctx && !document.hidden) audio.ctx.resume();
  mode = prevMode === 'ad' ? 'menu' : prevMode;
  return ok;
}

async function skipLevel() {
  if (mode !== 'play') return;
  platform.gameplayStop();
  const ok = await runAd('rewarded');
  if (ok) {
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    persist();
    startLevel(levelIndex + 1);
  } else {
    mode = 'play';
    platform.gameplayStart();
    showBanner('No ad right now', 'Try again in a moment. You can do this one anyway!');
  }
}

// ---------- Overlays ----------
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>';

function showOverlay(html, onBind) {
  $('panel').innerHTML = html;
  $('overlay').classList.remove('hidden');
  $('banner').classList.add('hidden');
  onBind && onBind($('panel'));
  overlayShownAt = performance.now();
}
function hideOverlay() { $('overlay').classList.add('hidden'); }
function bind(panel, sel, fn) {
  panel.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (ev) => { audio.play('click'); fn(ev, el); }));
}

let lastComplete = null;
function showComplete(stars, prevStars, again = false) {
  lastComplete = [stars, prevStars];
  const last = levelIndex === LEVELS.length - 1;
  const better = S.deaths > L.par ? `Finish with ${L.par} or fewer deaths for ★★★` : 'Perfect run!';
  showOverlay(`
    <h1>Level ${levelIndex + 1} done!</h1>
    <p class="quip">${pick(WIN_QUIPS)}</p>
    <div class="stars">${[0, 1, 2].map(() => `<div class="star">${STAR_SVG}</div>`).join('')}</div>
    <div class="stat-row"><div>${S.deaths}<span>deaths</span></div><div>${L.par}<span>par</span></div><div>${save.best[levelIndex]}<span>fewest</span></div><div>${(S.t / 60).toFixed(1)}s<span>${newRecord ? 'new record!' : `best ${save.bestTime[levelIndex].toFixed(1)}s`}</span></div></div>
    <p>${better}</p>
    <div class="btns">
      <button class="btn" data-a="levels">Levels</button>
      <button class="btn" data-a="retry">Retry</button>
      <button class="btn primary" data-a="next">${last ? 'Finish' : 'Next ▸'}</button>
    </div>`, (panel) => {
    bind(panel, '[data-a=retry]', () => startLevel(levelIndex, { banner: false }));
    bind(panel, '[data-a=levels]', () => showLevels());
    bind(panel, '[data-a=next]', () => goNext());
    panel.querySelectorAll('.star').forEach((el, i) => {
      if (i < stars && again) el.classList.add('on');
      else if (i < stars) setTimeout(() => { el.classList.add('on'); audio.play('star'); }, 250 + i * 220);
    });
    const unlockedSkin = SKINS.find((s) => s.need > 0 && totalStars() >= s.need && totalStars() - (stars - Math.min(stars, prevStars)) < s.need);
    if (unlockedSkin && !again) setTimeout(() => showBannerToast(`New skin unlocked: ${unlockedSkin.name}!`), 900);
  });
}

function showBannerToast(text) {
  const p = document.createElement('p');
  p.className = 'total'; p.textContent = text;
  $('panel').appendChild(p);
}

function showPause() {
  if (mode !== 'play') return;
  mode = 'paused';
  platform.gameplayStop();
  showOverlay(`
    <h1>Paused</h1>
    <p class="quip">The jelly waits. Patiently. Wobbling.</p>
    <div class="btns">
      <button class="btn primary" data-a="resume">Resume</button>
      <button class="btn" data-a="restart">Restart</button>
      <button class="btn" data-a="levels">Levels</button>
      <button class="btn" data-a="skins">Skins</button>
    </div>
    <div class="toggles">
      <button class="btn" data-a="sfx">Sound: ${save.sfx ? 'on' : 'off'}</button>
      <button class="btn" data-a="music">Music: ${save.music ? 'on' : 'off'}</button>
    </div>
    <p class="quip">Total deaths: ${save.totalDeaths} · Stars: ${totalStars()}/${LEVELS.length * 3}</p>`, (panel) => {
    bind(panel, '[data-a=resume]', resume);
    bind(panel, '[data-a=restart]', () => { resume(); restart(); });
    bind(panel, '[data-a=levels]', () => showLevels());
    bind(panel, '[data-a=skins]', () => showSkins());
    bind(panel, '[data-a=sfx]', (e, el) => { save.sfx = !save.sfx; applyAudio(); persist(); el.textContent = `Sound: ${save.sfx ? 'on' : 'off'}`; });
    bind(panel, '[data-a=music]', (e, el) => { save.music = !save.music; applyAudio(); persist(); el.textContent = `Music: ${save.music ? 'on' : 'off'}`; });
  });
}

function resume() {
  hideOverlay();
  mode = 'play';
  last = performance.now();
  platform.gameplayStart();
}

// Where Back/Escape from Levels and Skins returns to.
let menuReturn = null;
function rememberReturn() {
  if (mode === 'paused') menuReturn = () => { mode = 'play'; showPause(); };
  else if (mode === 'complete') { const args = lastComplete; menuReturn = () => { mode = 'complete'; showComplete(args[0], args[1], true); }; }
  else if (mode === 'end') menuReturn = showEnd;
}

function showLevels() {
  if (mode !== 'menu') rememberReturn();
  mode = 'menu';
  platform.gameplayStop();
  let html = '<button class="close" data-a="back" aria-label="Back">×</button><h1>Levels</h1><div class="worlds">';
  WORLDS.forEach((w, wi) => {
    html += `<div class="world"><h2>${w.name}</h2><div class="levels">`;
    for (let i = wi * LEVELS_PER_WORLD; i < Math.min(LEVELS.length, (wi + 1) * LEVELS_PER_WORLD); i++) {
      const locked = i >= save.unlocked, st = save.stars[i] || 0;
      html += `<button class="lvl ${locked ? 'locked' : ''} ${i === levelIndex ? 'current' : ''}" data-i="${i}" ${locked ? 'disabled' : ''} aria-label="Level ${i + 1}">${i + 1}<small>${locked ? '' : '★'.repeat(st) + '☆'.repeat(3 - st)}</small></button>`;
    }
    html += '</div></div>';
  });
  html += `</div><p class="total">★ ${totalStars()} / ${LEVELS.length * 3}</p><div class="btns"><button class="btn" data-a="back">Back</button><button class="btn primary" data-a="skins">Skins</button></div>`;
  showOverlay(html, (panel) => {
    bind(panel, '.lvl:not(.locked)', (e, el) => startLevel(+el.dataset.i));
    bind(panel, '[data-a=back]', () => showPauseFromMenu());
    bind(panel, '[data-a=skins]', () => showSkins());
  });
}

function showPauseFromMenu() {
  if (menuReturn) menuReturn();
  else { mode = 'play'; showPause(); }
}

function showSkins() {
  if (mode !== 'menu') rememberReturn();
  mode = 'menu';
  platform.gameplayStop();
  const stars = totalStars();
  let html = `<button class="close" data-a="back" aria-label="Back">×</button><h1>Skins</h1><p class="quip">Earn stars to unlock. You have ★ ${stars}.</p><div class="skins">`;
  SKINS.forEach((s) => {
    const locked = stars < s.need;
    html += `<button class="skin ${locked ? 'locked' : ''} ${s.id === save.skin ? 'sel' : ''}" data-id="${s.id}" ${locked ? 'disabled' : ''}><canvas width="112" height="112"></canvas>${locked ? `★ ${s.need}` : s.name}</button>`;
  });
  html += '</div><div class="btns"><button class="btn primary" data-a="back">Back</button></div>';
  showOverlay(html, (panel) => {
    panel.querySelectorAll('.skin').forEach((el) => {
      const s = SKINS.find((k) => k.id === el.dataset.id);
      Renderer.preview(el.querySelector('canvas'), s, stars < s.need);
    });
    bind(panel, '.skin:not(.locked)', (e, el) => { save.skin = el.dataset.id; persist(); showSkins(); });
    bind(panel, '[data-a=back]', () => showPauseFromMenu());
  });
}

function showEnd() {
  mode = 'end';
  platform.happytime();
  showOverlay(`
    <h1>You beat Splat Stack!</h1>
    <p class="quip">Every one of those deaths is somewhere in a wall, smiling.</p>
    <div class="stat-row"><div>${save.totalDeaths}<span>total deaths</span></div><div>${totalStars()}/${LEVELS.length * 3}<span>stars</span></div></div>
    <p>Go back and three-star every level to unlock every skin.</p>
    <div class="btns"><button class="btn primary" data-a="levels">Levels</button><button class="btn" data-a="skins">Skins</button></div>`, (panel) => {
    bind(panel, '[data-a=levels]', () => showLevels());
    bind(panel, '[data-a=skins]', () => showSkins());
  });
}

// ---------- Input ----------
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'j', KeyW: 'j', Space: 'j', KeyZ: 'j', KeyK: 'j',
};
function syncInput() {
  input.l = keys.l.size > 0; input.r = keys.r.size > 0; input.j = keys.j.size > 0;
}
window.addEventListener('keydown', (e) => {
  audio.unlock();
  const k = KEYMAP[e.code];
  if (k || e.code === 'ArrowDown') e.preventDefault();
  if (mode === 'play') {
    if (k) { keys[k].add(e.code); syncInput(); }
    if (e.code === 'KeyR' && !e.repeat) restart();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) showPause();
  } else if (mode === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
    resume();
  } else if (mode === 'complete' && !e.repeat && (e.code === 'Enter' || e.code === 'Space') && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    if (!$('overlay').classList.contains('hidden') && performance.now() - overlayShownAt > 400) goNext();
  } else if (mode === 'complete' && e.code === 'KeyR' && !e.repeat) {
    startLevel(levelIndex, { banner: false });
  } else if (mode === 'menu' && (e.code === 'Escape' || e.code === 'Backspace') && !e.repeat) {
    showPauseFromMenu();
  }
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) { keys[k].delete(e.code); syncInput(); }
});
window.addEventListener('blur', () => { for (const s of Object.values(keys)) s.clear(); syncInput(); });

let touchMode = false;
function setupTouch() {
  const show = () => { touchMode = true; $('touch').classList.remove('hidden'); resize(); };
  if (window.matchMedia('(pointer: coarse)').matches) show();
  window.addEventListener('touchstart', show, { once: true, passive: true });
  document.querySelectorAll('.tbtn').forEach((btn) => {
    const k = btn.dataset.k, id = 'touch-' + k;
    const down = (e) => { e.preventDefault(); audio.unlock(); keys[k].add(id); btn.classList.add('on'); syncInput(); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); };
    const up = () => { keys[k].delete(id); btn.classList.remove('on'); syncInput(); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  });
  window.addEventListener('pointerdown', () => audio.unlock());
}

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && [...pads].find(Boolean);
  const set = (k, on) => { if (on) keys[k].add('pad'); else keys[k].delete('pad'); };
  if (!gp) {
    if (keys.l.has('pad') || keys.r.has('pad') || keys.j.has('pad')) { set('l', false); set('r', false); set('j', false); syncInput(); }
    return;
  }
  const ax = gp.axes[0] || 0, b = gp.buttons;
  set('l', ax < -0.4 || (b[14] && b[14].pressed));
  set('r', ax > 0.4 || (b[15] && b[15].pressed));
  set('j', (b[0] && b[0].pressed) || (b[12] && b[12].pressed));
  if (b[9] && b[9].pressed && mode === 'play') showPause();
  syncInput();
}

// ---------- Audio ----------
function applyAudio({ adPlaying = mode === 'ad' } = {}) {
  audio.sfxOn = save.sfx;
  audio.musicOn = save.music;
  audio.forcedMute = adPlaying || platform.muteSetting;
  audio.apply();
}

// ---------- Layout ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const reserve = touchMode ? Math.max(56, Math.min(96, h * 0.17)) : 0;
  // Keep the HUD pills off the top rows of the level.
  const top = Math.min(48, h * 0.09);
  R.resize(w, h, Math.min(2, window.devicePixelRatio || 1), reserve, top);
  $('rotate').classList.toggle('hidden', !(h > w * 1.15 && window.matchMedia('(pointer: coarse)').matches));
}

// ---------- Loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(250, now - (last || now));
  last = now;
  pollGamepad();
  if (mode === 'play' && S) {
    acc += dt;
    while (acc >= DT) {
      R.savePrev(S.p);
      step(L, S, input);
      if (S.events.length) handleEvents(S.events);
      acc -= DT;
      if (S.won) { onWin(); break; }
    }
  }
  fxAcc += dt;
  while (fxAcc >= DT) { R.tick(); fxAcc -= DT; }
  if (L) R.draw(L, S, skin(), Math.min(1, acc / DT), now);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (mode === 'play') showPause(); if (audio.ctx) audio.ctx.suspend(); }
  else if (audio.ctx && mode !== 'ad') audio.ctx.resume();
});

$('btn-pause').addEventListener('click', () => { audio.unlock(); showPause(); });
$('btn-restart').addEventListener('click', () => { audio.unlock(); if (mode === 'play') restart(); });
$('btn-skip').addEventListener('click', () => { audio.unlock(); skipLevel(); });

async function boot() {
  window.addEventListener('resize', resize);
  resize();
  setupTouch();
  await platform.init();
  platform.loadingStart();
  const loaded = platform.load();
  if (loaded) save = { ...save, ...loaded };
  applyAudio();
  platform.onSettings(() => applyAudio());
  // Land straight in gameplay: the first level not yet finished.
  // Continue from the newest unlocked level; once it is finished, go after missing stars.
  const newest = Math.min(save.unlocked, LEVELS.length) - 1;
  const notPerfect = LEVELS.findIndex((_, i) => (save.stars[i] || 0) < 3);
  const firstOpen = !save.stars[newest] ? newest : notPerfect >= 0 ? notPerfect : 0;
  platform.loadingStop();
  startLevel(firstOpen);
  requestAnimationFrame(frame);
}

boot();
