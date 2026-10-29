// Game loop, input (mouse/keyboard/touch), HUD, menus and progression.
import { WEAPONS, PRIMARIES, STREAKS, MODES, DIFFICULTY, XP, xpForLevel, levelForXp } from './data.js';
import { TILE } from './map.js';
import { createMatch, step, DT, emptyControls, eyeY, aimTarget, standings, lookDir } from './sim.js';
import { Renderer, verticalFov } from './render.js';
import { Audio } from './audio.js';
import { platform } from './platform.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const tags = $('tags');
const tagCtx = tags.getContext('2d');
const mini = $('minimap');
const miniCtx = mini.getContext('2d');
const audio = new Audio();

let renderer;
try {
  renderer = new Renderer(canvas);
} catch (e) {
  $('panel').innerHTML = `<h1 class="logo">Frontline <span>Zero</span></h1>
    <p class="tag">Your browser does not support WebGL2, which this game needs. Try an up-to-date Chrome, Edge, Firefox or Safari.</p>`;
  throw e;
}

// ---------------------------------------------------------------- save
const defaults = {
  xp: 0, primary: 'vanguard', mode: 'tdm', difficulty: 1, sens: 1, fov: 100, volume: 0.8,
  quality: 2, showFps: false, matches: 0, wins: 0, kills: 0,
};
// PC build (desktop/): the Electron shell exposes `window.desktop`; no ads there, real fullscreen and FPS options
const desktop = window.desktop || null;
let desktopSettings = { fullscreen: false, uncapped: false };
const QUALITY = [
  { name: 'Low', scale: 0.6 },
  { name: 'Medium', scale: 0.8 },
  { name: 'High', scale: 1 },
  { name: 'Ultra', scale: 1, fullDpr: true },
];

function applyQuality() {
  const q = QUALITY[save.quality] || QUALITY[2];
  const dpr = window.devicePixelRatio || 1;
  renderer.scale = Math.min(dpr, q.fullDpr ? 3 : 1.5) * q.scale;
  $('fps').classList.toggle('hidden', !save.showFps);
}
let save = { ...defaults };

function persist() { platform.save(save); }

// ---------------------------------------------------------------- state
let screen = 'menu'; // menu | play | pause | end
let s = null, me = null;
let acc = 0, last = performance.now();
let matchesThisSession = 0, lastMidgame = 0;
let lastEndXp = null;
const touchMode = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (touchMode) document.body.classList.add('touch');

// ---------------------------------------------------------------- input
const keys = new Set();
const edge = { jump: false, crouch: false, reload: false, swap: false, nade: false };
let mouseFire = false, mouseAds = false;
let lookDX = 0, lookDY = 0, frameLookDX = 0, frameLookDY = 0;
let showBoard = false;
let noLock = false; // pointer lock refused (some iframes): read raw mouse movement instead
const touch = { mx: 0, mz: 0, fire: false, ads: false, stickId: null, lookId: null, lx: 0, ly: 0, sx: 0, sy: 0, sprint: false };

addEventListener('keydown', (e) => {
  if (e.code === 'Tab') { e.preventDefault(); showBoard = true; }
  if (e.code === 'F11' && desktop) {
    e.preventDefault();
    desktopSettings.fullscreen = !desktopSettings.fullscreen;
    desktop.setFullscreen(desktopSettings.fullscreen);
    return;
  }
  if (screen !== 'play') {
    if (e.code === 'Escape' && screen === 'pause') resume();
    return;
  }
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') edge.jump = true;
  if (e.code === 'KeyC' || e.code === 'ControlLeft') { edge.crouch = true; e.preventDefault(); }
  if (e.code === 'KeyR') edge.reload = true;
  if (e.code === 'KeyQ' || (e.code === 'Digit1' && me.cur !== 0) || (e.code === 'Digit2' && me.cur !== 1)) edge.swap = true;
  if (e.code === 'KeyG') edge.nade = true;
  if (e.code === 'Escape') pause();
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Tab') showBoard = false;
});
addEventListener('blur', () => { keys.clear(); mouseFire = mouseAds = false; });
addEventListener('wheel', (e) => { if (screen === 'play' && Math.abs(e.deltaY) > 20) edge.swap = true; }, { passive: true });

canvas.addEventListener('mousedown', (e) => {
  audio.unlock();
  if (screen !== 'play') return;
  if (!document.pointerLockElement && !touchMode && !noLock) { lockPointer(); return; }
  if (e.button === 0) mouseFire = true;
  if (e.button === 2) mouseAds = true;
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseFire = false;
  if (e.button === 2) mouseAds = false;
});
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousemove', (e) => {
  if (screen !== 'play' || !(document.pointerLockElement || noLock)) return;
  lookDX += e.movementX; lookDY += e.movementY;
});

function lockPointer() {
  if (noLock) return;
  const fallback = () => {
    try {
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => { noLock = true; });
    } catch { noLock = true; }
  };
  try {
    const r = canvas.requestPointerLock({ unadjustedMovement: true });
    if (r && r.catch) r.catch(fallback);
  } catch { fallback(); }
}
document.addEventListener('pointerlockerror', () => { noLock = true; });
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  $('click-to-play').classList.toggle('hidden', locked || screen !== 'play' || touchMode);
  if (!locked && screen === 'play' && !touchMode) pause();
});

// touch: left half = joystick, right half = look; buttons on top
function setupTouch() {
  const knob = $('knob'), stick = $('stick');
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || screen !== 'play') return;
    audio.unlock();
    if (e.clientX < innerWidth * 0.42 && touch.stickId === null) {
      touch.stickId = e.pointerId; touch.sx = e.clientX; touch.sy = e.clientY;
      stick.style.left = `${e.clientX - 65}px`; stick.style.top = `${e.clientY - 65}px`; stick.style.bottom = 'auto';
    } else if (touch.lookId === null) {
      touch.lookId = e.pointerId; touch.lx = e.clientX; touch.ly = e.clientY;
    }
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId === touch.stickId) {
      let dx = e.clientX - touch.sx, dy = e.clientY - touch.sy;
      const l = Math.hypot(dx, dy), max = 55;
      if (l > max) { dx *= max / l; dy *= max / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      touch.mx = dx / max; touch.mz = -dy / max;
      touch.sprint = l > max * 0.95 && touch.mz > 0.8;
    } else if (e.pointerId === touch.lookId) {
      lookDX += (e.clientX - touch.lx) * 1.6; lookDY += (e.clientY - touch.ly) * 1.6;
      touch.lx = e.clientX; touch.ly = e.clientY;
    }
  });
  const end = (e) => {
    if (e.pointerId === touch.stickId) {
      touch.stickId = null; touch.mx = touch.mz = 0; touch.sprint = false; knob.style.transform = '';
    }
    if (e.pointerId === touch.lookId) touch.lookId = null;
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  // fire button also looks around while held, like most mobile shooters
  const fire = $('t-fire');
  let fireId = null, fx = 0, fy = 0;
  fire.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); fireId = e.pointerId; fx = e.clientX; fy = e.clientY; touch.fire = true; fire.classList.add('on');
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== fireId) return;
    lookDX += (e.clientX - fx) * 1.4; lookDY += (e.clientY - fy) * 1.4; fx = e.clientX; fy = e.clientY;
  });
  const fireEnd = (e) => { if (e.pointerId === fireId) { fireId = null; touch.fire = false; fire.classList.remove('on'); } };
  addEventListener('pointerup', fireEnd);
  addEventListener('pointercancel', fireEnd);
  $('t-ads').addEventListener('pointerdown', (e) => {
    e.stopPropagation(); touch.ads = !touch.ads; $('t-ads').classList.toggle('on', touch.ads);
  });
  for (const [id, k] of [['t-jump', 'jump'], ['t-crouch', 'crouch'], ['t-reload', 'reload'], ['t-swap', 'swap'], ['t-nade', 'nade']]) {
    $(id).addEventListener('pointerdown', (e) => { e.stopPropagation(); edge[k] = true; });
  }
}
if (touchMode) setupTouch();

function readControls(firstStep) {
  const c = emptyControls();
  c.mz = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touch.mz;
  c.mx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.mx;
  c.fire = mouseFire || touch.fire;
  c.ads = mouseAds || touch.ads;
  c.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.sprint;
  if (firstStep) {
    const w = WEAPONS[me.weapons[me.cur].id];
    const zoom = 1 + (w.zoom - 1) * me.ads;
    const k = 0.0022 * save.sens / zoom;
    c.dyaw = -lookDX * k; c.dpitch = -lookDY * k;
    frameLookDX = lookDX; frameLookDY = lookDY;
    lookDX = lookDY = 0;
    Object.assign(c, edge);
    for (const key in edge) edge[key] = false;
  }
  return c;
}

// ---------------------------------------------------------------- match flow
function startMatch() {
  audio.unlock();
  s = createMatch({
    mode: save.mode, seed: (Math.random() * 1e9) | 0, difficulty: DIFFICULTY[save.difficulty].skill,
    human: { name: 'You', primary: save.primary },
  });
  me = s.players[0];
  renderer.anim.clear(); renderer.fx = []; renderer.corpses = []; renderer.tracers = [];
  renderer.buildMap(s.map, me.team);
  buildMinimap();
  $('feed').innerHTML = ''; $('notices').innerHTML = '';
  $('sb-mode').textContent = `${s.cfg.short} · ${s.cfg.scoreLimit}`;
  hud.streakKey = '';
  screen = 'play';
  $('overlay').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('touch').classList.toggle('hidden', !touchMode);
  if (!touchMode) lockPointer();
  platform.gameplayStart();
  notice(s.cfg.name, 'big');
  notice(s.cfg.teams ? `First team to ${s.cfg.scoreLimit} kills wins` : `First to ${s.cfg.scoreLimit} kills wins`);
}

function pause() {
  if (screen !== 'play') return;
  screen = 'pause';
  mouseFire = mouseAds = false; keys.clear();
  platform.gameplayStop();
  if (document.pointerLockElement) document.exitPointerLock();
  showPanel(`
    <h1 class="logo">Paused</h1>
    <div class="row" style="margin-top:22px"><button class="btn" id="resume">Resume</button></div>
    ${settingsHtml()}
    <div class="row"><button class="btn ghost" id="quit">Leave match</button>${desktop ? '<button class="btn ghost" id="exit">Quit to desktop</button>' : ''}</div>`);
  $('resume').onclick = resume;
  if (desktop) $('exit').onclick = () => desktop.quit();
  $('quit').onclick = () => { s = null; menu(); };
  bindSettings();
}

function resume() {
  screen = 'play';
  $('overlay').classList.add('hidden');
  last = performance.now();
  if (!touchMode) lockPointer();
  platform.gameplayStart();
}

function finishMatch() {
  screen = 'end';
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('board').classList.add('hidden');
  platform.gameplayStop();
  if (document.pointerLockElement) document.exitPointerLock();
  matchesThisSession++;
  const ranked = standings(s);
  const place = ranked.indexOf(me) + 1;
  const win = s.cfg.teams ? s.winner === me.team : place === 1;
  const draw = s.cfg.teams && s.winner === -1;
  const lines = [
    ['Kills', me.kills * XP.kill],
    ['Headshots', me.headshots * XP.head],
    ['Scorestreaks', me.earned.length * XP.streak],
    ['Match completed', XP.match],
  ];
  if (win) lines.push([s.cfg.teams ? 'Victory' : '1st place', XP.win]);
  const gained = lines.reduce((a, l) => a + l[1], 0);
  const before = levelForXp(save.xp);
  save.xp += gained; save.matches++; save.kills += me.kills; if (win) save.wins++;
  const after = levelForXp(save.xp);
  persist();
  lastEndXp = gained;
  if (win) platform.happytime();
  const unlocked = PRIMARIES.filter((id) => WEAPONS[id].unlock > before && WEAPONS[id].unlock <= after);
  const title = draw ? 'Draw' : win ? (s.cfg.teams ? 'Victory' : '1st place') : (s.cfg.teams ? 'Defeat' : `${ordinal(place)} place`);
  audio.announce(win ? 'end' : 'bad');
  showPanel(`
    <h1 class="result ${win ? 'win' : 'lose'}">${title}</h1>
    <div class="tag">${s.cfg.teams ? `${s.teamScore[me.team]} – ${s.teamScore[1 - me.team]}` : `${me.kills} kills · leader ${ranked[0].name} ${ranked[0].kills}`}</div>
    <div class="stats">
      <div><b>${me.kills}</b><small>Kills</small></div>
      <div><b>${me.deaths}</b><small>Deaths</small></div>
      <div><b>${(me.kills / Math.max(1, me.deaths)).toFixed(2)}</b><small>K/D</small></div>
      <div><b>${me.bestStreak}</b><small>Best streak</small></div>
    </div>
    <div class="xplines">${lines.map(([n, v]) => `<div><span>${n}</span><b>+${v} XP</b></div>`).join('')}
      <div><span>Total</span><b id="xp-total">+${gained} XP</b></div></div>
    ${after > before ? `<div class="unlock">Level up! You are now level ${after}.</div>` : ''}
    ${unlocked.map((id) => `<div class="unlock">Unlocked: ${WEAPONS[id].name} (${WEAPONS[id].kind})</div>`).join('')}
    ${levelHtml()}
    <div class="row" style="margin-top:18px">
      <button class="btn" id="again">Play again</button>
      ${desktop ? '' : '<button class="btn ghost" id="double">▶ Double XP</button>'}
      <button class="btn ghost" id="tomenu">Loadout</button>
    </div>`);
  $('again').onclick = () => withMidgame(startMatch);
  $('tomenu').onclick = () => withMidgame(menu);
  if (!desktop) $('double').onclick = async () => {
    $('double').disabled = true;
    const ok = await platform.ad('rewarded', adHooks());
    if (ok) {
      save.xp += lastEndXp; persist();
      $('double').textContent = `+${lastEndXp} XP added`;
      $('xp-total').textContent = `+${lastEndXp * 2} XP`;
    } else $('double').textContent = 'Ad not available';
  };
}

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

function adHooks() {
  return {
    onStart: () => { audio.forcedMute = true; audio.apply(); },
    onEnd: () => { audio.forcedMute = platform.muteSetting; audio.apply(); },
  };
}

async function withMidgame(next) {
  const now = performance.now();
  if (!desktop && matchesThisSession >= 2 && now - lastMidgame > 180000) {
    lastMidgame = now;
    await platform.ad('midgame', adHooks());
  }
  next();
}

// ---------------------------------------------------------------- menus
function showPanel(html) {
  $('panel').innerHTML = html;
  $('overlay').classList.remove('hidden');
}

function levelHtml() {
  const l = levelForXp(save.xp), a = xpForLevel(l), b = xpForLevel(l + 1);
  return `<div class="lvl"><b>Level ${l}</b><div class="xp"><i style="width:${(100 * (save.xp - a)) / (b - a)}%"></i></div><span>${save.xp - a} / ${b - a} XP</span></div>`;
}

function settingsHtml() {
  return `<div class="label">Settings</div>
    <div class="row"><label>Sensitivity <input type="range" id="sens" min="0.2" max="3" step="0.05" value="${save.sens}"></label></div>
    <div class="row"><label>Field of view <input type="range" id="fov" min="70" max="120" step="1" value="${save.fov}"></label> <span id="fov-v">${save.fov}</span></div>
    <div class="row"><label>Volume <input type="range" id="vol" min="0" max="1" step="0.05" value="${save.volume}"></label></div>
    <div class="row"><span>Graphics</span>
      <div class="seg">${QUALITY.map((q, i) => `<button data-quality="${i}" class="${i === save.quality ? 'on' : ''}">${q.name}</button>`).join('')}</div>
    </div>
    <div class="row">
      <label><input type="checkbox" id="showfps" ${save.showFps ? 'checked' : ''}> Show FPS</label>
      ${desktop ? `<label><input type="checkbox" id="fullscreen" ${desktopSettings.fullscreen ? 'checked' : ''}> Fullscreen <kbd>F11</kbd></label>
      <label><input type="checkbox" id="uncapped" ${desktopSettings.uncapped ? 'checked' : ''}> Unlimited FPS</label>
      <button class="btn ghost small hidden" id="restart">Restart to apply</button>` : ''}
    </div>`;
}

function bindSettings() {
  $('sens').oninput = (e) => { save.sens = +e.target.value; persist(); };
  $('fov').oninput = (e) => { save.fov = +e.target.value; $('fov-v').textContent = save.fov; persist(); };
  $('vol').oninput = (e) => { save.volume = +e.target.value; audio.volume = save.volume; audio.apply(); persist(); };
  for (const b of document.querySelectorAll('[data-quality]')) {
    b.onclick = () => {
      save.quality = +b.dataset.quality; persist(); applyQuality();
      for (const o of document.querySelectorAll('[data-quality]')) o.classList.toggle('on', o === b);
    };
  }
  $('showfps').onchange = (e) => { save.showFps = e.target.checked; persist(); applyQuality(); };
  if (!desktop) return;
  $('fullscreen').onchange = (e) => { desktopSettings.fullscreen = e.target.checked; desktop.setFullscreen(e.target.checked); };
  $('uncapped').onchange = async (e) => {
    await desktop.setUncapped(e.target.checked);
    $('restart').classList.toggle('hidden', e.target.checked === startedUncapped);
  };
  $('restart').onclick = () => desktop.restart();
}
let startedUncapped = false;

function statBar(v) { return `<div class="bar"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div>`; }

function menu() {
  screen = 'menu';
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  const level = levelForXp(save.xp);
  if (WEAPONS[save.primary].unlock > level) save.primary = 'vanguard';
  const guns = PRIMARIES.map((id) => {
    const w = WEAPONS[id], locked = w.unlock > level;
    const dps = (w.dmg * (w.pellets || 1) * w.rpm) / 60;
    return `<button class="gun ${id === save.primary ? 'on' : ''} ${locked ? 'locked' : ''}" data-gun="${id}" ${locked ? 'disabled' : ''}>
      <small>${w.kind}</small><b>${w.name}</b>
      ${locked ? `<small>Unlocks at level ${w.unlock}</small>` : `
        <small>Damage</small>${statBar(dps / 450)}
        <small>Range</small>${statBar(Math.min(w.range, 60) / 60)}
        <small>Mobility</small>${statBar((w.move - 0.75) / 0.35)}`}
    </button>`;
  }).join('');
  showPanel(`
    <h1 class="logo">Frontline <span>Zero</span></h1>
    <div class="tag">${desktop ? `6v6 firefights · killstreaks · v${desktopSettings.version || ''}` : '6v6 firefights · killstreaks · no download'}</div>
    ${levelHtml()}
    <div class="row" style="margin-top:18px"><button class="btn" id="play">Play</button>${desktop ? '<button class="btn ghost" id="exit">Quit</button>' : ''}</div>
    <div class="row">
      <div class="seg" id="modes">${Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}" class="${k === save.mode ? 'on' : ''}">${m.name}</button>`).join('')}</div>
    </div>
    <div class="row">
      <div class="seg" id="diffs">${DIFFICULTY.map((d, i) => `<button data-diff="${i}" class="${i === save.difficulty ? 'on' : ''}">${d.name}</button>`).join('')}</div>
    </div>
    <div class="label">Primary weapon</div>
    <div class="guns">${guns}</div>
    ${settingsHtml()}
    <div class="keys">
      <kbd>WASD</kbd> move · <kbd>Mouse</kbd> aim · <kbd>LMB</kbd> fire · <kbd>RMB</kbd> aim down sights ·
      <kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump · <kbd>C</kbd> crouch / slide · <kbd>R</kbd> reload ·
      <kbd>Q</kbd> swap · <kbd>G</kbd> grenade · <kbd>Tab</kbd> scores<br>
      Kill streaks: 3 = UAV · 5 = Air Strike · 7 = Attack Drone
    </div>`);
  $('play').onclick = startMatch;
  if (desktop) $('exit').onclick = () => desktop.quit();
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { save.mode = b.dataset.mode; persist(); menu(); };
  for (const b of document.querySelectorAll('[data-diff]')) b.onclick = () => { save.difficulty = +b.dataset.diff; persist(); menu(); };
  for (const b of document.querySelectorAll('[data-gun]')) b.onclick = () => { save.primary = b.dataset.gun; persist(); menu(); };
  bindSettings();
}

$('btn-pause').onclick = pause;
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------------------------------------------------------------- HUD
const hud = { hitT: 0, streakKey: '', lastHp: 100, stepDist: 0 };

function notice(text, cls = '') {
  const el = document.createElement('div');
  el.textContent = text;
  if (cls) el.className = cls;
  const box = $('notices');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 1600);
}

function feed(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  const box = $('feed');
  box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.remove(), 5000);
}

function nameSpan(p) {
  const cls = p === me ? 'me' : s.cfg.teams && p.team === me.team ? 'a' : 'e';
  return `<span class="${cls}">${escapeHtml(p.name)}</span>`;
}
function escapeHtml(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const WEAPON_LABEL = { frag: 'Frag', strike: 'Air Strike', drone: 'Drone' };

// pan and volume of a sound at (x, z) for the local player
function spatial(x, z, range = 90) {
  const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz);
  if (d < 0.5) return [0, 1];
  const rx = -Math.cos(me.yaw), rz = Math.sin(me.yaw);
  return [(dx * rx + dz * rz) / d, Math.max(0, 1 - d / range) ** 1.4];
}

function handleEvents() {
  for (const e of s.events) {
    renderer.event(e, s, me);
    switch (e.type) {
      case 'fire': {
        if (e.id === me.id) audio.gun(e.weapon);
        else if (e.id >= 0) { const p = s.players[e.id]; const [pan, g] = spatial(p.x, p.z); audio.gun(e.weapon, pan, g * 0.8); }
        else { const [pan, g] = spatial(e.x, e.z); audio.gun('drone', pan, g); }
        break;
      }
      case 'hit':
        if (e.attacker === me.id && e.victim !== me.id) {
          hitmarker(false);
          audio.hitmarker(e.head);
        }
        if (e.victim === me.id) {
          audio.hurt();
          if (e.attacker !== me.id) damageArrow(e.fromX, e.fromZ);
        }
        break;
      case 'kill': {
        const k = s.players[e.killer], v = s.players[e.victim];
        const wname = WEAPONS[e.weapon] ? WEAPONS[e.weapon].name : WEAPON_LABEL[e.weapon] || e.weapon;
        feed(k === v ? `${nameSpan(v)}<span class="w">${wname}</span>` : `${nameSpan(k)}<span class="w">${e.head ? '⌖ ' : ''}${wname}</span>${nameSpan(v)}`);
        if (k === me && v !== me) {
          hitmarker(true);
          audio.killConfirm(e.head);
          notice(`${e.head ? 'Headshot' : 'Kill'} +${XP.kill + (e.head ? XP.head : 0)}`);
          if (me.streak >= 2 && e.weapon !== 'strike' && e.weapon !== 'drone') notice(`${me.streak} kill streak`);
        }
        if (v === me) {
          $('death-by').innerHTML = k === me ? 'You blew yourself up' : `Killed by ${nameSpan(k)}`;
        }
        break;
      }
      case 'explode': {
        const [pan, g] = spatial(e.x, e.z, 120);
        audio.explosion(pan, g);
        break;
      }
      case 'streak': {
        const p = s.players[e.id];
        const ours = s.cfg.teams ? p.team === me.team : p === me;
        if (p === me) { notice(e.name, 'big'); audio.announce('good'); }
        else if (ours) notice(`Friendly ${e.name} inbound`);
        else { notice(`Enemy ${e.name} inbound!`, 'bad'); audio.announce('bad'); }
        if (e.streak === 'strike') audio.jet(0);
        break;
      }
      case 'reload': if (e.id === me.id) audio.reload(); break;
      case 'swap': if (e.id === me.id) audio.swap(); break;
      case 'feed': feed(`<span class="${e.by === me.id ? 'me' : 'w'}">${escapeHtml(e.text)}</span>`); break;
      case 'end': break;
      default: break;
    }
  }
  s.events.length = 0;
}

function hitmarker(kill) {
  const el = $('hitmark');
  el.classList.remove('show', 'kill');
  void el.offsetWidth;
  el.classList.add('show');
  if (kill) el.classList.add('kill');
}

function damageArrow(fx, fz) {
  const rel = Math.atan2(fx - me.x, fz - me.z) - me.yaw;
  const el = document.createElement('i');
  el.style.transform = `rotate(${-rel}rad)`;
  $('dmgdir').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

let miniBase = null;
function buildMinimap() {
  const map = s.map, px = 3;
  miniBase = document.createElement('canvas');
  miniBase.width = map.w * px; miniBase.height = map.h * px;
  const g = miniBase.getContext('2d');
  g.fillStyle = 'rgba(60, 66, 60, 0.9)';
  g.fillRect(0, 0, miniBase.width, miniBase.height);
  for (let i = 0; i < map.w * map.h; i++) {
    const h = map.height[i];
    if (!h) continue;
    g.fillStyle = h > 3 ? '#c9c6bb' : h > 1 ? '#8f8a7a' : '#76786f';
    g.fillRect((i % map.w) * px, Math.floor(i / map.w) * px, px, px);
  }
}

function drawMinimap() {
  const W = mini.width, c = miniCtx, scale = 3 / TILE; // minimap px per metre
  c.clearRect(0, 0, W, W);
  c.save();
  c.beginPath(); c.rect(0, 0, W, W); c.clip();
  c.translate(W / 2, W / 2);
  // rotate so that the player's forward is up (world +z/+x are flipped to screen)
  c.rotate(me.yaw + Math.PI);
  c.translate(-me.x * scale, -me.z * scale);
  c.drawImage(miniBase, 0, 0);
  const uav = s.uav[me.team] > s.t;
  for (const p of s.players) {
    if (!p.alive || p === me) continue;
    const ally = s.cfg.teams && p.team === me.team;
    const firing = s.t - p.lastFire < 1;
    if (!ally && !uav && !firing) continue;
    c.fillStyle = ally ? '#4d9bff' : '#ff4433';
    c.beginPath(); c.arc(p.x * scale, p.z * scale, ally ? 3 : 3.5, 0, Math.PI * 2); c.fill();
  }
  for (const dr of s.drones) {
    c.fillStyle = dr.team === me.team ? '#4d9bff' : '#ff4433';
    c.fillRect(dr.x * scale - 4, dr.z * scale - 4, 8, 8);
  }
  for (const st of s.strikes) {
    c.strokeStyle = '#ffb030'; c.lineWidth = 2;
    c.beginPath(); c.arc(st.x * scale, st.z * scale, 6 * scale * 1.2, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
  // the player
  c.fillStyle = '#f2b33d';
  c.beginPath(); c.moveTo(W / 2, W / 2 - 7); c.lineTo(W / 2 + 5, W / 2 + 5); c.lineTo(W / 2 - 5, W / 2 + 5); c.closePath(); c.fill();
  if (uav) { c.fillStyle = '#f2b33d'; c.font = 'bold 11px sans-serif'; c.fillText('UAV', 6, W - 8); }
}

function drawTags(target) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
  if (tags.width !== w || tags.height !== h) { tags.width = w; tags.height = h; }
  tagCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tagCtx.clearRect(0, 0, innerWidth, innerHeight);
  tagCtx.font = '600 13px Bahnschrift, "Arial Narrow", sans-serif';
  tagCtx.textAlign = 'center';
  for (const p of s.players) {
    if (!p.alive || p === me) continue;
    const ally = s.cfg.teams && p.team === me.team;
    if (!ally && p !== target) continue;
    const d = Math.hypot(p.x - me.x, p.z - me.z);
    if (ally && d > 70) continue;
    const pt = renderer.project(p.x, p.y + 2.15, p.z);
    if (!pt) continue;
    tagCtx.fillStyle = ally ? '#7db8ff' : '#ff6a5a';
    tagCtx.shadowColor = 'rgba(0,0,0,0.8)'; tagCtx.shadowBlur = 3;
    tagCtx.fillText(p.name, pt[0], pt[1]);
  }
}

function updateHud(dt) {
  const w = WEAPONS[me.weapons[me.cur].id], slot = me.weapons[me.cur];
  // score bar
  if (s.cfg.teams) {
    $('sb-a').textContent = s.teamScore[me.team];
    $('sb-b').textContent = s.teamScore[1 - me.team];
  } else {
    const best = s.players.filter((p) => p !== me).reduce((a, p) => Math.max(a, p.kills), 0);
    $('sb-a').textContent = me.kills;
    $('sb-b').textContent = best;
  }
  const tl = Math.max(0, Math.ceil(s.timeLeft));
  $('sb-time').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('sb-time').classList.toggle('low', tl <= 30);
  // weapon
  $('ammo-name').textContent = w.name;
  const mag = $('ammo-mag');
  mag.textContent = slot.mag;
  mag.classList.toggle('low', slot.mag <= w.mag * 0.25);
  $('ammo-res').textContent = `/ ${slot.reserve}`;
  $('nades').textContent = me.nades ? '● '.repeat(me.nades).trim() + ' G' : '';
  $('ammo-hint').textContent = me.reloadT > 0 ? 'RELOADING' : slot.mag === 0 && slot.reserve === 0 ? 'NO AMMO' : slot.mag <= w.mag * 0.25 ? 'RELOAD [R]' : '';
  // health
  $('hp-fill').style.width = `${Math.max(0, me.hp)}%`;
  $('hp-fill').classList.toggle('low', me.hp < 40);
  $('blood').style.opacity = me.alive ? Math.max(0, (1 - me.hp / 100) * 1.1 - 0.1).toFixed(2) : 0.6;
  // crosshair: gap follows the real spread
  const xh = $('xhair');
  const target = me.alive ? aimTarget(s, me) : null;
  const enemyAimed = target && (!s.cfg.teams || target.team !== me.team);
  xh.classList.toggle('enemy', !!enemyAimed);
  const moving = Math.hypot(me.vx, me.vz) > 1.5 ? 1 : 0;
  const spread = (w.hip + me.bloom + moving * w.hip * 0.5 + (me.onGround ? 0 : w.hip));
  const fovRad = verticalFov(save.fov, innerWidth / innerHeight);
  const gap = Math.max(3, (spread / Math.tan(fovRad / 2)) * (innerHeight / 2));
  xh.querySelector('.l').style.left = `${-gap - 9}px`;
  xh.querySelector('.r').style.left = `${gap}px`;
  xh.querySelector('.t').style.top = `${-gap - 9}px`;
  xh.querySelector('.b').style.top = `${gap}px`;
  xh.style.opacity = !me.alive || me.sprint || me.ads > 0.5 ? 0 : 1;
  const scoped = w.scope && me.ads > 0.9 && me.alive;
  $('scope').classList.toggle('hidden', !scoped);
  // death
  $('death').classList.toggle('hidden', me.alive);
  if (!me.alive) $('death-t').textContent = `Respawning in ${Math.max(0, me.respawn).toFixed(1)}`;
  // streak ladder
  const key = `${me.streak}|${me.earned.length}`;
  if (key !== hud.streakKey) {
    hud.streakKey = key;
    $('streaks').innerHTML = STREAKS.map((st) => {
      const cls = me.streak >= st.kills ? 'done' : me.streak === st.kills - 1 ? 'ready' : '';
      return `<div class="${cls}">${st.name} <span style="float:right">${Math.min(me.streak, st.kills)}/${st.kills}</span></div>`;
    }).join('');
  }
  // footsteps
  if (me.alive && me.onGround) {
    hud.stepDist += Math.hypot(me.vx, me.vz) * dt;
    if (hud.stepDist > (me.sprint ? 2.6 : 2.1)) { hud.stepDist = 0; if (me.slideT <= 0) audio.step(me.sprint ? 0.5 : 0.3); }
  }
  for (const p of s.players) {
    if (p === me || !p.alive || !p.onGround || p.crouch) continue;
    p.stepAcc = (p.stepAcc || 0) + Math.hypot(p.vx, p.vz) * dt;
    if (p.stepAcc > 2.4) {
      p.stepAcc = 0;
      const [, g] = spatial(p.x, p.z, 20);
      if (g > 0.05) audio.step(g * 0.5);
    }
  }
  drawMinimap();
  drawTags(target);
  // scoreboard
  $('board').classList.toggle('hidden', !showBoard);
  if (showBoard) renderBoard();
}

function renderBoard() {
  const ranked = standings(s);
  const table = (list) => `<table><tr><th>Player</th><th class="n">K</th><th class="n">D</th><th class="n">Streak</th></tr>
    ${list.map((p) => `<tr class="${p === me ? 'me' : ''}"><td>${escapeHtml(p.name)}</td><td class="n">${p.kills}</td><td class="n">${p.deaths}</td><td class="n">${p.streak}</td></tr>`).join('')}</table>`;
  if (s.cfg.teams) {
    const mine = ranked.filter((p) => p.team === me.team), theirs = ranked.filter((p) => p.team !== me.team);
    $('board').innerHTML = `<div><h3 class="a">Your team · ${s.teamScore[me.team]}</h3>${table(mine)}</div>
      <div><h3 class="e">Enemy · ${s.teamScore[1 - me.team]}</h3>${table(theirs)}</div>`;
  } else $('board').innerHTML = `<div><h3>Free-for-All</h3>${table(ranked)}</div>`;
}

// ---------------------------------------------------------------- loop
const fpsMeter = { frames: 0, t: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (save.showFps) {
    fpsMeter.frames++; fpsMeter.t += dt;
    if (fpsMeter.t >= 0.5) { $('fps').textContent = `${Math.round(fpsMeter.frames / fpsMeter.t)} FPS`; fpsMeter.frames = 0; fpsMeter.t = 0; }
  }
  if (screen === 'play' && s) {
    acc += dt;
    let first = true;
    while (acc >= DT) {
      step(s, readControls(first));
      first = false;
      acc -= DT;
      handleEvents();
      if (s.over) break;
    }
    if (s.over) { acc = 0; finishMatch(); }
  }
  if (s && me) {
    renderer.frame(s, me, { fov: save.fov, lookDX: frameLookDX, lookDY: frameLookDY }, screen === 'play' ? dt : 0);
    frameLookDX = frameLookDY = 0;
    if (screen === 'play') updateHud(dt);
  } else menuBackdrop(now / 1000);
}

// slow fly-over of the arena behind the main menu
let backdrop = null;
function menuBackdrop(t) {
  if (!backdrop) {
    backdrop = createMatch({ mode: 'tdm', seed: 7, difficulty: 0.5 });
    renderer.buildMap(backdrop.map, 0);
  }
  for (let i = 0; i < 2; i++) step(backdrop, null);
  backdrop.events.length = 0;
  if (backdrop.over) backdrop = null;
  if (!backdrop) return;
  const eye = [40 + Math.sin(t * 0.05) * 34, 12, 40 + Math.cos(t * 0.05) * 34];
  const camera = { eye, yaw: Math.atan2(40 - eye[0], 40 - eye[2]), pitch: -0.32 };
  // `me` is only used for team colours here: everyone on team 0 shows blue
  renderer.frame(backdrop, { ...backdrop.players[0], id: -99 }, { fov: 100, lookDX: 0, lookDY: 0, camera }, 1 / 60);
}

// ?debug exposes the running match for tools/screens.cjs
if (new URLSearchParams(location.search).has('debug')) {
  window.fz = { get s() { return s; }, get me() { return me; }, renderer, startMatch, edge, touch };
}

// ---------------------------------------------------------------- boot
(async function boot() {
  platform.loadingStart();
  await platform.init();
  save = { ...defaults, ...(platform.load() || {}) };
  save.fov = Math.min(120, Math.max(70, save.fov));
  if (desktop) {
    try { desktopSettings = await desktop.settings(); } catch (e) { console.warn(e); }
    startedUncapped = !!desktopSettings.uncapped;
  }
  applyQuality();
  audio.volume = save.volume;
  audio.forcedMute = platform.muteSetting;
  platform.onSettings((st) => { audio.forcedMute = !!(st && st.muteAudio); audio.apply(); });
  platform.loadingStop();
  menu();
  requestAnimationFrame(frame);
}());
