import test from 'node:test';
import assert from 'node:assert/strict';
import { allSlots, defaultSettings, newJourney, readSettings, readSlot, saveSettings, saveSlot, timeLabel } from '../src/save.js';

const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
  },
});

test('save slots preserve progress and isolate newer journeys', () => {
  store.clear();
  assert.deepEqual(allSlots(), [null, null, null]);
  const journey = newJourney('  Lin  ');
  journey.position = [-0.7, 3.6];
  journey.view = [0.3, -0.1];
  journey.seconds = 71;
  assert.ok(saveSlot(1, journey));
  assert.ok(saveSlot(2, newJourney('')));
  assert.deepEqual({ ...readSlot(1), savedAt: undefined }, { ...journey, savedAt: undefined });
  assert.equal(readSlot(1).name, 'Lin');
  assert.equal(readSlot(2).name, '信使奶龙');
  assert.equal(timeLabel(readSlot(1).seconds), '00:01');
  assert.equal(allSlots()[2], null);
});

test('corrupt and incompatible checkpoints leave the other slots usable', () => {
  store.clear();
  assert.ok(saveSlot(1, { ...newJourney('Invalid'), version: 2 }));
  assert.ok(saveSlot(2, { ...newJourney('Invalid'), act: 4 }));
  assert.ok(saveSlot(3, newJourney('Valid')));
  assert.deepEqual(allSlots().map(data => data?.name ?? null), [null, null, 'Valid']);
  store.set('lantern-vale:v1:slot-3', 'invalid');
  assert.equal(readSlot(3), null);
});

test('settings read safely and clamp out-of-range values', () => {
  store.clear();
  assert.deepEqual(readSettings(), defaultSettings);
  assert.ok(saveSettings({ volume: 12, sensitivity: -10, textSpeed: 'instant', motion: false, quality: 'low' }));
  assert.deepEqual(readSettings(), { ...defaultSettings, volume: 1, sensitivity: 0.25, textSpeed: 'instant', motion: false, quality: 'low' });
});

test('English v1 saves keep their original checkpoint and gain Chinese defaults', () => {
  store.clear();
  assert.ok(saveSlot(1, { ...newJourney(''), name: 'The Courier', done: ['arrival'], act: 1 }));
  assert.equal(readSlot(1).name, '信使奶龙');
  assert.equal(readSlot(1).act, 1);
  assert.deepEqual(readSlot(1).done, ['arrival']);
  assert.ok(saveSlot(2, newJourney('Lan')));
  assert.equal(readSlot(2).name, 'Lan');
});

test('independent audio levels survive loading and are clamped', () => {
  store.clear();
  assert.ok(saveSettings({ voiceVolume: 0, musicVolume: 0.22, effectsVolume: 1.7 }));
  assert.deepEqual(readSettings(), { ...defaultSettings, voiceVolume: 0, musicVolume: 0.22, effectsVolume: 1 });
});
