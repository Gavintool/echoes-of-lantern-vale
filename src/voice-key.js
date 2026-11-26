export function voiceKey(speaker, text) {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash = Math.imul(hash ^ character.codePointAt(0), 0x01000193);
  }
  return speaker + '-' + (hash >>> 0).toString(16).padStart(8, '0');
}
