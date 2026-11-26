import { allDialogueLines } from '../src/story.js';
import { voiceKey } from '../src/voice-key.js';

const lines = allDialogueLines().map(({ speaker, text }) => ({ speaker, text, key: voiceKey(speaker, text) }));
console.log(JSON.stringify(lines));
