// Every sound is synthesized: no audio files, no licensing, zero budget.
(function (NR) {
  'use strict';
  let ctx = null, master = null;
  const settings = NR.store.get('settings', { sound: true, music: true, speed: 1 });
  NR.settings = settings;
  NR.saveSettings = () => NR.store.set('settings', settings);

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.5, dest) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.setValueAtTime(vol, t0 + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  const sfx = {
    ring() { for (let i = 0; i < 2; i++) { tone(440, i * 0.5, 0.4, 'sine', 0.25); tone(480, i * 0.5, 0.4, 'sine', 0.25); } },
    pickup() { tone(1200, 0, 0.03, 'square', 0.2); tone(300, 0.04, 0.05, 'square', 0.15); },
    hangup() { tone(480, 0, 0.25, 'sine', 0.3); tone(620, 0, 0.25, 'sine', 0.3); tone(480, 0.3, 0.25, 'sine', 0.3); tone(620, 0.3, 0.25, 'sine', 0.3); },
    click() { tone(1800, 0, 0.02, 'square', 0.08); },
    card() { tone(660, 0, 0.05, 'triangle', 0.25); tone(990, 0.05, 0.07, 'triangle', 0.2); },
    good() { tone(523, 0, 0.08, 'triangle', 0.3); tone(784, 0.08, 0.12, 'triangle', 0.3); },
    bad() { tone(220, 0, 0.15, 'sawtooth', 0.15); tone(160, 0.12, 0.2, 'sawtooth', 0.15); },
    cash() { [1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.12, 'square', 0.12)); tone(80, 0.2, 0.15, 'square', 0.2); },
    error() { tone(140, 0, 0.3, 'square', 0.2); },
    alarm() { for (let i = 0; i < 6; i++) { tone(880, i * 0.5, 0.25, 'sawtooth', 0.2); tone(660, i * 0.5 + 0.25, 0.25, 'sawtooth', 0.2); } },
    combo() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.05, 0.1, 'square', 0.12)); },
    popup() { tone(900, 0, 0.06, 'square', 0.12); tone(600, 0.07, 0.06, 'square', 0.12); },
    coin() { tone(988, 0, 0.06, 'square', 0.15); tone(1319, 0.06, 0.2, 'square', 0.15); },
  };

  NR.sfx = function (name) {
    if (!settings.sound) return;
    try { sfx[name] && sfx[name](); } catch (e) { /* audio blocked */ }
  };

  // Greensleeves (public domain), the patron saint of hold music.
  const GREEN = [
    [57, 1], [60, 2], [62, 1], [64, 1.5], [65, 0.5], [64, 1], [62, 2], [59, 1], [55, 1.5], [57, 0.5], [59, 1], [60, 2], [57, 1], [57, 1.5], [56, 0.5], [57, 1], [59, 2], [56, 1], [52, 2],
    [57, 1], [60, 2], [62, 1], [64, 1.5], [65, 0.5], [64, 1], [62, 2], [59, 1], [55, 1.5], [57, 0.5], [59, 1], [60, 1.5], [59, 0.5], [57, 1], [56, 1.5], [54, 0.5], [56, 1], [57, 3],
  ];
  let holdTimer = null;
  NR.holdMusic = function (on) {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (!on || !settings.music || !settings.sound) return;
    const c = ac(); if (!c) return;
    const beat = 0.32;
    let t = 0;
    for (const [n, d] of GREEN) {
      const f = 440 * Math.pow(2, (n - 69) / 12);
      tone(f * 2, t, d * beat * 0.95, 'triangle', 0.12);
      tone(f, t, d * beat * 0.95, 'sine', 0.06);
      t += d * beat;
    }
    holdTimer = setTimeout(() => NR.holdMusic(true), t * 1000);
  };

  // Optional mic input (Chrome/Edge). Transcribed locally by the browser; we store nothing.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  NR.micSupported = !!SR;
  NR.listen = function (onText, onEnd) {
    if (!SR) return null;
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => { let s = ''; for (const res of e.results) s += res[0].transcript; onText(s, e.results[e.results.length - 1].isFinal); };
    r.onend = onEnd; r.onerror = onEnd;
    try { r.start(); } catch (e) { NR.toast && NR.toast('Microphone unavailable here.', 'warn'); return null; }
    return r;
  };
})(window.NR);
