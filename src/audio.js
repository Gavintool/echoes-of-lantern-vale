import { voiceKey } from './voice-key.js';

const base = import.meta.env.BASE_URL + 'audio/';
const loopPaths = {
  menu: 'music/menu',
  night: 'music/night',
  day: 'music/dawn',
  river: 'ambience/river',
  wind: 'ambience/wind',
  birds: 'ambience/dawn',
};
const distanceToBell = z => Math.min(...[-9, -34, -50, -74, -96].map(location => Math.abs(location - z)));

export class Soundscape {
  constructor(settings) {
    this.settings = settings;
    this.mode = 'menu';
    this.act = 0;
    this.cache = new Map();
    this.voiceCache = new Map();
    this.loops = new Map();
    this.voiceTicket = 0;
    this.mixTicket = 0;
    this.step = 0;
    this.nextBell = 3;
    this.riverPan = 0;
    this.riverLevel = 0.32;
  }

  start() {
    if (this.context) {
      return this.context.state === 'suspended' ? this.context.resume() : Promise.resolve();
    }
    if (!globalThis.AudioContext) return Promise.resolve();
    const ctx = new AudioContext();
    this.context = ctx;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.ambience = ctx.createGain();
    this.effects = ctx.createGain();
    this.speech = ctx.createGain();

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.22;
    this.master.connect(limiter).connect(ctx.destination);
    for (const bus of [this.music, this.ambience, this.effects, this.speech]) bus.connect(this.master);
    this.setSettings(this.settings);
    this.refreshMix();
    return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
  }

  setSettings(settings) {
    this.settings = settings;
    if (!this.context) return;
    this.fade(this.master.gain, settings.volume, 0.07);
    this.fade(this.effects.gain, settings.effectsVolume, 0.12);
    this.fade(this.ambience.gain, settings.effectsVolume * (this.speaking ? 0.52 : 1), 0.15);
    this.fade(this.speech.gain, settings.voiceVolume, 0.08);
    this.fade(this.music.gain, settings.musicVolume * (this.speaking ? 0.34 : 0.9), 0.19);
    if (!settings.voiceVolume && this.speaking) this.stopVoice();
  }

  fade(parameter, value, duration) {
    const time = this.context.currentTime;
    parameter.cancelScheduledValues(time);
    parameter.setTargetAtTime(value, time, duration);
  }

  buffer(path, voice = false) {
    const cache = voice ? this.voiceCache : this.cache;
    const existing = cache.get(path);
    if (existing) {
      cache.delete(path);
      cache.set(path, existing);
      return existing;
    }
    if (voice && cache.size >= 26) cache.delete(cache.keys().next().value);
    const request = fetch(base + path + '.mp3').then(response => {
      if (!response.ok) throw new Error(path + ' ' + response.status);
      return response.arrayBuffer();
    }).then(data => this.context.decodeAudioData(data)).catch(() => null);
    cache.set(path, request);
    return request;
  }

  setMode(mode, act = this.act) {
    if (this.mode === mode && this.act === act) return;
    this.mode = mode;
    this.act = act;
    if (this.context) this.refreshMix();
  }

  mixForMode() {
    if (this.mode === 'menu') return { menu: 0.72, wind: 0.10 };
    if (this.mode === 'ending') return { day: 0.74, birds: 0.16, river: 0.12 };
    return {
      [this.act === 4 ? 'day' : 'night']: this.act === 3 ? 0.40 : 0.53,
      river: this.riverLevel,
      wind: this.act === 2 ? 0.28 : 0.17,
      ...(this.act === 4 ? { birds: 0.24 } : {}),
    };
  }

  refreshMix() {
    const ticket = ++this.mixTicket;
    const desired = this.mixForMode();
    for (const [name, sound] of this.loops) {
      if (Object.hasOwn(desired, name)) continue;
      this.fade(sound.gain.gain, 0, 0.33);
      sound.source.stop(this.context.currentTime + 1.55);
      this.loops.delete(name);
    }
    for (const [name, volume] of Object.entries(desired)) {
      const current = this.loops.get(name);
      if (current) {
        this.fade(current.gain.gain, volume, 0.24);
        continue;
      }
      this.buffer(loopPaths[name]).then(buffer => {
        if (!buffer || ticket !== this.mixTicket) return;
        const ctx = this.context;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain);
        const pan = name === 'river' ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = this.riverPan;
          gain.connect(pan).connect(this.ambience);
        } else gain.connect(['menu', 'night', 'day'].includes(name) ? this.music : this.ambience);
        source.start();
        this.loops.set(name, { source, gain, pan });
        this.fade(gain.gain, this.mixForMode()[name] ?? 0, 0.37);
      });
    }
  }

  updatePosition(x, z, yaw) {
    this.riverPan = -Math.cos(yaw) * 0.62;
    this.riverLevel = 0.27 - x * 0.021;
    const river = this.loops.get('river');
    if (river && this.mode === 'world') {
      this.fade(river.pan.pan, this.riverPan, 0.22);
      this.fade(river.gain.gain, this.riverLevel, 0.25);
    }
    if (!this.context || this.context.currentTime < this.nextBell || distanceToBell(z) > 4.8) return;
    this.nextBell = this.context.currentTime + 8 + Math.random() * 5;
    this.cue('windbell', 0.52 * Math.cos(yaw), 0.23);
  }

  prime(items) {
    if (!this.context || !this.settings.voiceVolume) return;
    for (const item of items) {
      if (item) this.buffer('voice/' + voiceKey(item.speaker, item.text), true);
    }
  }

  async speak(item, onStatus) {
    this.stopVoice();
    if (!this.context || !this.settings.voiceVolume || !item) return;
    const ticket = this.voiceTicket;
    const buffer = await this.buffer('voice/' + voiceKey(item.speaker, item.text), true);
    if (!buffer || ticket !== this.voiceTicket || !this.settings.voiceVolume) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.speech);
    this.speaking = true;
    this.voice = { source, onStatus };
    this.setSettings(this.settings);
    onStatus?.(true);
    source.onended = () => {
      if (this.voice?.source === source) this.stopVoice();
    };
    source.start();
  }

  stopVoice() {
    this.voiceTicket++;
    if (!this.voice) return;
    const { source, onStatus } = this.voice;
    this.voice = null;
    this.speaking = false;
    source.onended = null;
    source.stop();
    source.disconnect();
    this.setSettings(this.settings);
    onStatus?.(false);
  }

  async cue(name, pan = 0, strength = 0.76) {
    if (!this.context || !this.settings.effectsVolume) return;
    const step = name === 'step';
    if (step) name += (this.step++ % 4) + 1;
    const buffer = await this.buffer('effects/' + name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const direction = this.context.createStereoPanner();
    source.buffer = buffer;
    if (step) source.playbackRate.value = 0.96 + Math.random() * 0.13;
    direction.pan.value = pan;
    gain.gain.value = strength * (step ? 0.42 : 0.78);
    source.connect(gain).connect(direction).connect(this.effects);
    source.start();
  }
}
