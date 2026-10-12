// Every sound is synthesised with WebAudio, so the game ships no audio files.
export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.forcedMute = false; // set by the platform (ads, CrazyGames mute setting)
    this.musicTimer = null;
    this.beat = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.0; this.music.connect(this.master);
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
    this.sfx.gain.setTargetAtTime(this.sfxOn ? 0.55 : 0, t, 0.02);
    this.music.gain.setTargetAtTime(this.musicOn ? 0.16 : 0, t, 0.3);
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

  hiss(dur, vol, freq, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx);
    s.start(t); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const r = 1 + (Math.random() - 0.5) * 0.08;
    switch (name) {
      case 'jump': this.tone('square', 300 * r, 620 * r, 0.12, 0.12); break;
      case 'land': this.hiss(0.07, 0.15, 900); break;
      case 'die':
        this.hiss(0.3, 0.5, 1400);
        this.tone('sine', 220 * r, 50, 0.35, 0.45);
        this.tone('square', 140, 60, 0.18, 0.12, 0.02);
        break;
      case 'lava': this.hiss(0.6, 0.35, 600); this.tone('sine', 180, 40, 0.5, 0.35); break;
      case 'pop': this.tone('square', 900, 1400, 0.06, 0.12); this.tone('square', 1400, 700, 0.08, 0.08, 0.06); break;
      case 'spring': this.tone('sine', 200, 900, 0.25, 0.35); this.tone('triangle', 400, 1200, 0.2, 0.15, 0.03); break;
      case 'crumble': this.hiss(0.25, 0.25, 500); break;
      case 'shake': this.tone('triangle', 120, 90, 0.08, 0.12); break;
      case 'drop': this.tone('sine', 1500, 500, 0.25, 0.12); break;
      case 'shatter': this.hiss(0.15, 0.3, 4000); break;
      case 'door': this.tone('sine', 700, 1200, 0.1, 0.2); this.tone('sine', 900, 1500, 0.1, 0.2, 0.1); this.tone('sine', 1200, 1900, 0.12, 0.2, 0.2); break;
      case 'win':
        [523, 659, 784, 1047].forEach((n, i) => this.tone('triangle', n, n, 0.22, 0.25, i * 0.08));
        this.tone('sine', 1568, 1568, 0.4, 0.15, 0.32);
        break;
      case 'star': this.tone('triangle', 1047, 1568, 0.18, 0.25); break;
      case 'click': this.tone('triangle', 660, 880, 0.05, 0.15); break;
      case 'bonk': this.tone('square', 160, 120, 0.06, 0.08); break;
    }
  }

  startMusic() {
    // A tiny looping groove: bass + pentatonic plucks, scheduled ahead of time.
    const bass = [55, 55, 65.4, 49];
    const scale = [261.6, 293.7, 329.6, 392, 440, 523.3];
    const bpm = 112, spb = 60 / bpm / 2;
    let next = this.ctx.currentTime + 0.1;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.3) {
        const b = this.beat, bar = Math.floor(b / 8) % 4;
        const delay = next - this.ctx.currentTime;
        if (b % 2 === 0) this.tone('triangle', bass[bar], bass[bar], spb * 1.6, 0.5, delay, this.music);
        if (b % 4 === 2) this.hissMusic(0.05, 0.08, delay);
        if (rnd() < 0.55) {
          const n = scale[Math.floor(rnd() * scale.length)] * (bar === 3 ? 0.89 : 1);
          this.tone('sine', n, n, spb * 0.9, 0.18, delay, this.music);
        }
        this.beat++;
        next += spb;
      }
    };
    this.musicTimer = setInterval(tick, 100);
    this.apply();
  }

  hissMusic(dur, vol, delay) {
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.music);
    s.start(t); s.stop(t + dur + 0.02);
  }
}
