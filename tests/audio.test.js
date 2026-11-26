import { readdirSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { allDialogueLines } from '../src/story.js';
import { voiceKey } from '../src/voice-key.js';

test('every spoken branch has exactly one bundled Mandarin recording', () => {
  const directory = new URL('../public/audio/voice/', import.meta.url);
  const expected = allDialogueLines().map(item => voiceKey(item.speaker, item.text) + '.mp3');
  assert.equal(new Set(expected).size, expected.length);
  assert.deepEqual(readdirSync(directory).sort(), expected.sort());
  for (const filename of expected) assert.ok(statSync(new URL(filename, directory)).size > 2500, filename);
});
