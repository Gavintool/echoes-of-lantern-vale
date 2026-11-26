const chords = [[146.83, 220, 293.66], [130.81, 196, 329.63], [110, 164.81, 261.63], [98, 146.83, 246.94]];

export class Soundscape {
  constructor(volume) {
    this.volume = volume;
    this.mode = 'menu';
    this.step = 0;
  }

  async start() {
    if (this.context) {
      if (this.context.state === 'suspended') await this.context.resume();
      return;
    }
    if (!globalThis.AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);

    const noise = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
    const samples = noise.getChannelData(0);
    let filtered = 0;
    for (let i = 0; i < samples.length; i++) {
      filtered = 0.96 * filtered + (Math.random() * 2 - 1) * 0.04;
      samples[i] = filtered;
    }
    this.wind = this.context.createBufferSource();
    this.wind.buffer = noise;
    this.wind.loop = true;
    this.windGain = this.context.createGain();
    this.windGain.gain.value = 0.08;
    this.wind.connect(this.windGain).connect(this.master);
    this.wind.start();
    if (this.context.state === 'suspended') await this.context.resume();
    this.score();
  }

  setVolume(value) {
    this.volume = value;
    this.master?.gain.setTargetAtTime(value, this.context.currentTime, 0.08);
  }

  setMode(mode) {
    this.mode = mode;
    this.windGain?.gain.setTargetAtTime(mode === 'world' ? 0.21 : 0.07, this.context.currentTime, 0.7);
  }

  tone(frequency, duration, gain, delay = 0, type = 'sine', endFrequency = frequency) {
    if (!this.context || this.context.state !== 'running') return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    env.gain.setValueAtTime(0.001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.16, duration * 0.24));
    env.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(env).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  score() {
    const notes = chords[this.step++ % chords.length];
    const gain = this.mode === 'world' ? 0.039 : 0.077;
    notes.forEach((note, i) => {
      this.tone(note / 2, 4.9, gain, i * 0.18);
      this.tone(note * (i === 0 ? 2 : 1), 1.7, gain * 0.65, i * 0.55 + 0.28);
    });
    setTimeout(() => this.score(), 4700);
  }

  cue(name) {
    if (name === 'laugh') {
      [183, 229, 208, 169].forEach((note, i) => this.tone(note, 0.25, 0.19, i * 0.15, 'triangle', note * 0.66));
    } else if (name === 'step') {
      this.tone(81, 0.13, 0.055, 0, 'triangle', 35);
    } else {
      [440, 660].forEach((note, i) => this.tone(note, 0.56, 0.09, i * 0.09));
    }
  }
}
