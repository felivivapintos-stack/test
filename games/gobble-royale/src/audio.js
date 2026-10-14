// Every sound is synthesised with WebAudio, so the game ships no audio files.
export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.forcedMute = false; // set by the platform (ads, CrazyGames mute setting)
    this.beat = 0;
    this.fast = false;
    this.lastBlip = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.forcedMute ? 0 : 1, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.sfxOn ? 0.5 : 0, t, 0.02);
    this.music.gain.setTargetAtTime(this.musicOn ? 0.14 : 0, t, 0.3);
  }

  tone(type, f0, f1, dur, vol = 0.3, delay = 0, dest = this.sfx) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  hiss(dur, vol, freq, delay = 0, type = 'lowpass', dest = this.sfx) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // Snack blip: pitch climbs with the combo so streaks sound like a run up a scale.
  blip(combo) {
    if (!this.ctx || !this.sfxOn) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBlip < 0.035) return;
    this.lastBlip = now;
    const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const n = 440 * Math.pow(2, steps[Math.min(steps.length - 1, Math.max(0, combo - 1))] / 12);
    this.tone('sine', n, n * 1.5, 0.07, 0.16);
  }

  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const r = 1 + (Math.random() - 0.5) * 0.1;
    switch (name) {
      case 'critter': this.tone('square', 500 * r, 260 * r, 0.09, 0.1); this.tone('sine', 900 * r, 1400, 0.08, 0.12, 0.03); break;
      case 'gold':
        [1047, 1319, 1568, 2093].forEach((n, i) => this.tone('triangle', n, n, 0.12, 0.16, i * 0.05));
        break;
      case 'gulp':
        this.tone('sine', 300 * r, 70, 0.32, 0.5);
        this.tone('square', 180 * r, 90, 0.12, 0.12, 0.02);
        this.hiss(0.18, 0.3, 900);
        break;
      case 'farGulp': this.tone('sine', 220 * r, 70, 0.2, 0.15); break;
      case 'dash': this.hiss(0.22, 0.25, 2600, 0, 'bandpass'); this.tone('sine', 320, 640, 0.12, 0.08); break;
      case 'spike': this.tone('sawtooth', 420 * r, 110, 0.25, 0.18); this.hiss(0.2, 0.35, 3000); break;
      case 'crunch': this.hiss(0.25, 0.45, 1600); this.tone('square', 200, 80, 0.15, 0.15); break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((n, i) => this.tone('triangle', n, n, 0.16, 0.22, i * 0.06));
        break;
      case 'perk': this.tone('triangle', 784, 1568, 0.18, 0.25); break;
      case 'frenzy':
        for (let i = 0; i < 3; i++) { this.tone('square', 880, 660, 0.14, 0.12, i * 0.18); }
        break;
      case 'dead':
        this.tone('sine', 400, 60, 0.7, 0.4);
        this.tone('triangle', 300, 50, 0.6, 0.2, 0.05);
        this.hiss(0.4, 0.3, 800);
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((n, i) => this.tone('triangle', n, n, 0.25, 0.25, i * 0.09));
        this.tone('sine', 1568, 1568, 0.6, 0.18, 0.45);
        break;
      case 'end': [523, 440, 392].forEach((n, i) => this.tone('triangle', n, n, 0.22, 0.22, i * 0.12)); break;
      case 'coin': this.tone('square', 988, 988, 0.06, 0.08); this.tone('square', 1319, 1319, 0.12, 0.08, 0.06); break;
      case 'click': this.tone('triangle', 660, 880, 0.05, 0.15); break;
      case 'tick': this.tone('square', 1200, 1200, 0.04, 0.08); break;
      case 'revive': this.tone('sine', 300, 1200, 0.4, 0.3); break;
    }
  }

  setFast(on) { this.fast = on; }

  startMusic() {
    // A bouncy loop: bass, offbeat hats and pentatonic plucks, scheduled ahead of time.
    const bass = [65.4, 65.4, 87.3, 98];
    const scale = [392, 440, 523.3, 587.3, 659.3, 784];
    let next = this.ctx.currentTime + 0.1;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tick = () => {
      if (!this.ctx) return;
      const spb = 60 / (this.fast ? 150 : 120) / 2;
      while (next < this.ctx.currentTime + 0.3) {
        const b = this.beat, bar = Math.floor(b / 8) % 4;
        const delay = next - this.ctx.currentTime;
        if (b % 2 === 0) this.tone('triangle', bass[bar], bass[bar], spb * 1.5, 0.5, delay, this.music);
        if (b % 2 === 1) this.hiss(0.04, 0.07, 7000, delay, 'highpass', this.music);
        if (b % 8 === 4) this.hiss(0.1, 0.12, 1200, delay, 'bandpass', this.music);
        if (rnd() < 0.5) {
          const n = scale[Math.floor(rnd() * scale.length)];
          this.tone('sine', n, n, spb * 0.8, 0.16, delay, this.music);
        }
        this.beat++;
        next += spb;
      }
    };
    setInterval(tick, 100);
    this.apply();
  }
}
