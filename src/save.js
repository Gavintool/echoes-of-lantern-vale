import { chapters, outcomes, targets } from './story.js';

export const SLOT_COUNT = 3;
const prefix = 'lantern-vale:v1:';
export const defaultSettings = {
  volume: 0.72, voiceVolume: 0.96, musicVolume: 0.68, effectsVolume: 0.74,
  sensitivity: 1, textSpeed: 'steady', motion: true, quality: 'high',
};
const routes = ['yun', 'ren', 'friends'];
const storage = () => globalThis.localStorage;

function read(key) {
  try {
    return JSON.parse(storage().getItem(prefix + key));
  } catch {
    return null;
  }
}

function write(key, data) {
  try {
    storage().setItem(prefix + key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

const pair = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
const ids = new Set(targets.map(item => item.id));

export function newJourney(name) {
  return {
    version: 1,
    name: name.trim().slice(0, 28) || '信使奶龙',
    act: 0,
    done: [],
    position: [...chapters[0].spawn],
    view: [0, 0],
    bonds: { yun: 0, ren: 0, warmth: 0 },
    tuned: false,
    route: null,
    ending: null,
    completed: false,
    seconds: 0,
  };
}

export function readSlot(slot) {
  const data = read('slot-' + slot);
  if (data?.version !== 1 || typeof data.name !== 'string' || !Number.isInteger(data.act) || !chapters[data.act] ||
    !Array.isArray(data.done) || !data.done.every(id => ids.has(id)) || !pair(data.position) ||
    !pair(data.view) || !Number.isFinite(data.seconds) || !Number.isFinite(data.savedAt) || data.seconds < 0 ||
    typeof data.tuned !== 'boolean' || typeof data.completed !== 'boolean' ||
    !['yun', 'ren', 'warmth'].every(key => Number.isFinite(data.bonds?.[key])) ||
    (data.route !== null && !routes.includes(data.route)) ||
    (data.ending !== null && !Object.hasOwn(outcomes, data.ending)) ||
    (data.act === 4 && !data.ending)) return null;
  return data.name === 'The Courier' ? { ...data, name: '信使奶龙' } : data;
}

export function saveSlot(slot, data) {
  return write('slot-' + slot, { ...data, savedAt: Date.now() });
}

function volumeSetting(item, key) {
  return Number.isFinite(item[key]) ? Math.max(0, Math.min(1, item[key])) : defaultSettings[key];
}

export function readSettings() {
  const item = read('settings');
  if (!item) return { ...defaultSettings };
  return {
    volume: volumeSetting(item, 'volume'),
    voiceVolume: volumeSetting(item, 'voiceVolume'),
    musicVolume: volumeSetting(item, 'musicVolume'),
    effectsVolume: volumeSetting(item, 'effectsVolume'),
    sensitivity: Number.isFinite(item.sensitivity) ? Math.max(0.25, Math.min(2, item.sensitivity)) : defaultSettings.sensitivity,
    textSpeed: ['instant', 'steady', 'slow'].includes(item.textSpeed) ? item.textSpeed : defaultSettings.textSpeed,
    motion: typeof item.motion === 'boolean' ? item.motion : defaultSettings.motion,
    quality: item.quality === 'low' ? 'low' : defaultSettings.quality,
  };
}

export const saveSettings = item => write('settings', item);
export const allSlots = () => Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i + 1));
export const timeLabel = seconds => {
  const minutes = Math.floor(seconds / 60);
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
};
