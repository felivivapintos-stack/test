// GameMonetize adapter. The games already talk to the CrazyGames SDK v3 through a small
// wrapper, so instead of rewriting them this file exposes a window.CrazyGames.SDK look-alike
// backed by the GameMonetize SDK. Load it before the game's own scripts.
//
// build.py fills in GAME_ID from gamemonetize-ids.json.
(function () {
  var GAME_ID = 'COLA_AQUI_O_GAME_ID';
  var AD_START_TIMEOUT = 4000; // no ad started within this time: treat as "no fill"

  var pending = null; // callbacks of the ad currently on screen
  var startTimer = 0;

  function finish(ok) {
    clearTimeout(startTimer);
    var cb = pending;
    pending = null;
    if (!cb) return;
    try { ok ? cb.adFinished && cb.adFinished() : cb.adError && cb.adError({ code: 'noFill' }); } catch (e) {}
  }

  window.SDK_OPTIONS = {
    gameId: GAME_ID,
    onEvent: function (a) {
      switch (a.name) {
        case 'SDK_GAME_PAUSE': // ad starts: the game mutes and pauses through adStarted
          clearTimeout(startTimer);
          if (pending && !pending.started) {
            pending.started = true;
            try { pending.adStarted && pending.adStarted(); } catch (e) {}
          }
          break;
        case 'SDK_GAME_START': // ad finished or skipped: resume
          if (pending) finish(!!pending.started);
          break;
        case 'SDK_ERROR':
          finish(false);
          break;
      }
    }
  };

  (function (d, tag, id) {
    if (d.getElementById(id)) return;
    var s = d.createElement(tag), first = d.getElementsByTagName(tag)[0];
    s.id = id;
    s.src = 'https://api.gamemonetize.com/sdk.js';
    first.parentNode.insertBefore(s, first);
  })(document, 'script', 'gamemonetize-sdk');

  function store(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  var noop = function () {};

  window.CrazyGames = window.CrazyGames || {};
  window.CrazyGames.SDK = {
    environment: 'gamemonetize',
    init: function () { return Promise.resolve(); },
    game: {
      settings: { muteAudio: false },
      addSettingsChangeListener: noop,
      loadingStart: noop,
      loadingStop: noop,
      gameplayStart: noop,
      gameplayStop: noop,
      happytime: noop
    },
    ad: {
      // 'midgame' and 'rewarded' both map to showBanner(): GameMonetize serves the same
      // interstitial for both, and the game only grants a reward on adFinished.
      requestAd: function (type, callbacks) {
        if (pending) { callbacks && callbacks.adError && callbacks.adError({ code: 'busy' }); return; }
        if (!window.sdk || typeof window.sdk.showBanner !== 'function') {
          callbacks && callbacks.adError && callbacks.adError({ code: 'sdkNotReady' });
          return;
        }
        pending = { adStarted: callbacks && callbacks.adStarted, adFinished: callbacks && callbacks.adFinished, adError: callbacks && callbacks.adError, started: false };
        startTimer = setTimeout(function () { if (pending && !pending.started) finish(false); }, AD_START_TIMEOUT);
        try { window.sdk.showBanner(); } catch (e) { finish(false); }
      }
    },
    data: {
      getItem: function (k) { return store(function () { return localStorage.getItem(k); }, null); },
      setItem: function (k, v) { store(function () { localStorage.setItem(k, v); }); },
      removeItem: function (k) { store(function () { localStorage.removeItem(k); }); },
      clear: function () { store(function () { localStorage.clear(); }); }
    }
  };
})();
