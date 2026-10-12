// Thin wrapper over the CrazyGames HTML5 SDK v3. Every call is optional:
// off CrazyGames (local dev, other hosts, ad blockers) the game keeps working.
const SAVE_KEY = 'splatstack.save.v1';

export const platform = {
  sdk: null,
  inGameplay: false,

  async init() {
    const SDK = window.CrazyGames && window.CrazyGames.SDK;
    if (!SDK) return;
    try {
      await Promise.race([SDK.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
      if (SDK.environment === 'disabled') return;
      this.sdk = SDK;
    } catch (e) {
      console.warn('CrazyGames SDK unavailable:', e && e.message);
    }
  },

  call(fn) {
    if (!this.sdk) return;
    try { fn(this.sdk); } catch (e) { console.warn(e); }
  },

  loadingStart() { this.call((s) => s.game.loadingStart()); },
  loadingStop() { this.call((s) => s.game.loadingStop()); },
  gameplayStart() {
    if (this.inGameplay) return;
    this.inGameplay = true;
    this.call((s) => s.game.gameplayStart());
  },
  gameplayStop() {
    if (!this.inGameplay) return;
    this.inGameplay = false;
    this.call((s) => s.game.gameplayStop());
  },
  happytime() { this.call((s) => s.game.happytime()); },

  get muteSetting() {
    try { return !!(this.sdk && this.sdk.game.settings && this.sdk.game.settings.muteAudio); } catch { return false; }
  },
  onSettings(cb) {
    this.call((s) => s.game.addSettingsChangeListener && s.game.addSettingsChangeListener(cb));
  },

  // kind: 'midgame' | 'rewarded'. Resolves true when a rewarded ad finished.
  ad(kind, { onStart, onEnd } = {}) {
    return new Promise((resolve) => {
      if (!this.sdk) { resolve(kind === 'rewarded'); return; }
      let started = false;
      try {
        this.sdk.ad.requestAd(kind, {
          adStarted: () => { started = true; onStart && onStart(); },
          adFinished: () => { onEnd && onEnd(); resolve(true); },
          adError: () => { if (started && onEnd) onEnd(); resolve(false); },
        });
      } catch (e) {
        resolve(false);
      }
    });
  },

  load() {
    let raw = null;
    try { raw = this.sdk ? this.sdk.data.getItem(SAVE_KEY) : null; } catch {}
    if (raw == null) { try { raw = localStorage.getItem(SAVE_KEY); } catch {} }
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  save(data) {
    const raw = JSON.stringify(data);
    try { if (this.sdk) this.sdk.data.setItem(SAVE_KEY, raw); } catch {}
    try { localStorage.setItem(SAVE_KEY, raw); } catch {}
  },
};
