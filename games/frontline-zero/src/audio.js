// Every sound is synthesised with WebAudio, so the game ships no audio files.
const GUN_SOUND = {
  vanguard: { body: 900, len: 0.16, vol: 0.5, thump: 120 },
  kestrel: { body: 1400, len: 0.11, vol: 0.4, thump: 160 },
  bulldog: { body: 600, len: 0.32, vol: 0.75, thump: 80 },
  longbow: { body: 700, len: 0.5, vol: 0.85, thump: 60 },
  hammer: { body: 750, len: 0.18, vol: 0.55, thump: 100 },
  p9: { body: 1700, len: 0.12, vol: 0.4, thump: 180 },
  drone: { body: 2200, len: 0.08, vol: 0.25, thump: 300 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.forcedMute = false; // set by the platform (ads, CrazyGames mute setting)
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.forcedMute ? 0 : this.volume * 0.6, this.ctx.currentTime, 0.02);
  }

  // `pan` -1..1 and `gain` 0..1 come from where the sound happened relative to the listener
  out(pan, gain) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return g;
  }

  hiss(dest, dur, vol, freq, type = 'lowpass', delay = 0, q = 0.7) {
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  tone(dest, type, f0, f1, dur, vol, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  gun(weapon, pan = 0, gain = 1) {
    if (!this.ctx || gain < 0.02) return;
    const g = GUN_SOUND[weapon] || GUN_SOUND.vanguard;
    const d = this.out(pan, gain);
    // distant shots lose their crack and keep the boom
    this.hiss(d, g.len * 0.4, g.vol * gain, g.body * 3 * (0.4 + gain * 0.6), 'bandpass', 0, 0.5);
    this.hiss(d, g.len, g.vol * 0.9, g.body, 'lowpass');
    this.tone(d, 'triangle', g.thump * 1.8, g.thump * 0.5, g.len * 0.8, g.vol * 0.7);
  }

  explosion(pan, gain) {
    if (!this.ctx || gain < 0.02) return;
    const d = this.out(pan, gain);
    this.hiss(d, 1.3, 1.1, 400, 'lowpass');
    this.hiss(d, 0.3, 0.6, 2500, 'bandpass');
    this.tone(d, 'sine', 90, 30, 1, 0.9);
  }

  step(gain) {
    if (!this.ctx || gain < 0.03) return;
    this.hiss(this.out(0, gain), 0.07, 0.25, 500, 'bandpass', 0, 1.5);
  }

  hitmarker(head) {
    if (!this.ctx) return;
    const d = this.out(0, 1);
    this.tone(d, 'square', head ? 2600 : 1900, head ? 2400 : 1700, 0.05, 0.12);
    this.hiss(d, 0.04, 0.3, 4000, 'highpass');
  }

  killConfirm(head) {
    if (!this.ctx) return;
    const d = this.out(0, 1);
    this.tone(d, 'sine', 1320, 1320, 0.12, 0.3);
    this.tone(d, 'sine', head ? 1980 : 1760, head ? 1980 : 1760, 0.18, 0.25, 0.07);
  }

  hurt() {
    if (!this.ctx) return;
    const d = this.out(0, 1);
    this.hiss(d, 0.18, 0.5, 300, 'lowpass');
    this.tone(d, 'sine', 160, 80, 0.15, 0.3);
  }

  click() { if (this.ctx) this.tone(this.out(0, 1), 'square', 900, 700, 0.03, 0.08); }

  reload() {
    if (!this.ctx) return;
    const d = this.out(0.2, 1);
    this.hiss(d, 0.05, 0.4, 2500, 'bandpass', 0.15, 3);
    this.hiss(d, 0.06, 0.5, 1800, 'bandpass', 0.55, 3);
    this.tone(d, 'square', 500, 300, 0.04, 0.08, 0.6);
  }

  swap() {
    if (!this.ctx) return;
    this.hiss(this.out(0, 1), 0.08, 0.3, 1500, 'bandpass', 0, 2);
  }

  announce(kind) {
    if (!this.ctx) return;
    const d = this.out(0, 1);
    const seq = kind === 'bad' ? [440, 330, 247] : kind === 'end' ? [523, 659, 784, 1046] : [587, 784, 988];
    seq.forEach((f, i) => this.tone(d, 'sawtooth', f, f, 0.16, 0.12, i * 0.11));
  }

  jet(pan) {
    if (!this.ctx) return;
    const d = this.out(pan, 0.8);
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t);
    f.frequency.linearRampToValueAtTime(1800, t + 1.6); f.frequency.linearRampToValueAtTime(200, t + 3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.8, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    s.connect(f); f.connect(g); g.connect(d);
    s.start(t); s.stop(t + 3.1);
  }
}
