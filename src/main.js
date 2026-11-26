import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './style.css';
import { World } from './world.js';
import { Soundscape } from './audio.js';
import { icon } from './icons.js';
import { art } from './media.js';
import { allSlots, defaultSettings, newJourney, readSettings, readSlot, saveSettings, saveSlot, timeLabel } from './save.js';
import { applyChoice, cast, chapters, discoveries, finishScene, outcomes, sceneFor } from './story.js';

const app = document.querySelector('#app');
const $ = selector => app.querySelector(selector);
const numbers = ['I', 'II', 'III', 'IV', 'V'];
const blockedKeyCodes = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const slotNumber = value => String(value).padStart(2, '0');
const particles = Array.from({ length: 26 }, (_, i) => {
  const seed = i * 37 + 11;
  return `<i style="--x:${(seed * 13) % 100}%;--y:${(seed * 79) % 100}%;--s:${2 + seed % 5}px;--duration:${8 + seed % 11}s;--delay:-${seed % 19}s"></i>`;
}).join('');

let settings = readSettings();
let audio = new Soundscape(settings.volume);
let world;
let state;
let activeSlot;
let mode = 'menu';
let panel = null;
let menuOrigin = null;
let dialogue;
let textTicker;
let toastTicker;
let transitionTicker;
let closest;
let chosenSlot;
let elapsedCheckpoint = 0;
let cursorPointer = null;
let menuPreference = 'load';

app.innerHTML = `
<div id="menu" class="menu-screen">
  <div class="menu-landscape" style="--landscape:url('${art('vale.webp')}')"></div>
  <div class="menu-flare"></div>
  <div class="embers" aria-hidden="true">${particles}</div>
  <figure class="hero-dragon" aria-hidden="true"><img src="${art('milk-dragon.webp')}" alt=""></figure>
  <div class="menu-layout">
    <header class="menu-header">
      <div class="studio-brand"><span class="brand-icon">${icon.flame}</span><span>LANTERN VALE<span class="brand-sub">灯谷故事</span></span></div>
      <div class="top-tools"><button type="button" class="top-btn" data-action="help" aria-label="Controls" title="Controls">${icon.keyboard}</button><button type="button" class="top-btn" data-action="sound" aria-label="Toggle audio" title="Toggle audio" id="sound-toggle">${icon.sound}</button></div>
    </header>
    <section class="menu-content" aria-labelledby="game-title">
      <p class="eyebrow title-eyebrow"><span></span> A 奶龙 FAN GAME</p>
      <h1 id="game-title"><span>Echoes of</span><span>Lantern Vale</span></h1>
      <div class="title-han" lang="zh-Hans">灯谷回声</div>
      <p class="menu-description">A valley has lost its voice. All that’s left is one very loud laugh.</p>
      <nav class="menu-actions" aria-label="Main menu" id="menu-actions"></nav>
    </section>
    <footer class="menu-footer">
      <span class="audio-note">${icon.headphones} Headphones recommended</span>
      <span class="build-note">FIRST-PERSON STORY ADVENTURE <span>·</span> V1.0</span>
    </footer>
  </div>
</div>
<section id="play-screen" class="play-screen" hidden aria-label="3D exploration">
  <canvas id="world" aria-label="First-person view of Lantern Vale" tabindex="-1"></canvas>
  <div class="world-vignette"></div>
  <div class="hud" id="hud" hidden>
    <div class="quest"><span class="quest-icon">${icon.compass}</span><div><p class="eyebrow" id="hud-chapter"></p><h2 id="hud-objective"></h2></div></div>
    <div class="hud-tools"><button class="top-btn" data-action="journal" aria-label="Journal" title="Journal (J)">${icon.book}</button><button class="top-btn" data-action="pause" aria-label="Pause" title="Pause (Esc)">${icon.pause}</button></div>
    <span class="reticle" aria-hidden="true"></span>
    <div id="beacon" class="beacon" hidden><span aria-hidden="true"></span><strong></strong><small></small></div>
    <button id="interact" data-action="interact" class="interaction" type="button" hidden><kbd>E</kbd><span></span></button>
    <div class="walk-tip" id="walk-tip"><kbd>W A S D</kbd> Move <span>·</span> <kbd>DRAG</kbd> Look <span>·</span> <kbd>E</kbd> Interact</div>
    <div id="touch-stick" class="touch-stick" aria-label="Touch movement"><span></span></div>
  </div>
  <section id="dialogue" class="dialogue" aria-label="Dialogue" hidden></section>
  <div id="chapter-card" class="chapter-card" aria-hidden="true" hidden></div>
</section>
<div id="overlay" class="overlay" hidden>
  <section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" tabindex="-1"></section>
</div>
<div id="toast" role="status" class="toast" hidden></div>`;

const canvas = $('#world');
const hud = $('#hud');
const overlay = $('#overlay');
const panelContent = $('.panel');
const toast = $('#toast');
const dialogueElement = $('#dialogue');
const chapterCard = $('#chapter-card');
const beacon = $('#beacon');
const interact = $('#interact');
const touchStick = $('#touch-stick');

function menuButton(action, graphic, title, subtitle, primary = false) {
  return `<button type="button" class="menu-button ${primary ? 'primary' : ''}" data-action="${action}">
    <span class="menu-button-icon">${icon[graphic]}</span><span class="menu-button-text"><strong>${title}</strong><small>${subtitle}</small></span><span class="menu-chevron">${icon.chevron}</span></button>`;
}

function renderMenu() {
  const latest = lastSave();
  $('#menu-actions').innerHTML = [
    latest
      ? menuButton('continue', 'play', 'Continue', escapeHtml(latest.data.name) + ' · ' + (latest.data.completed ? 'Ending complete' : 'Chapter ' + numbers[latest.data.act]), true)
      : menuButton('new', 'play', 'Begin Journey', 'Start a new story', true),
    latest ? menuButton('new', 'sparkles', 'New Journey', 'Create a new save') : '',
    menuButton('load', 'folder', 'Load Journey', latest ? 'Open a saved story' : 'Browse save slots'),
    menuButton('settings', 'settings', 'Settings', 'Audio, visuals & controls'),
    menuButton('credits', 'info', 'Credits', 'The people and art behind the Vale'),
  ].join('');
  renderSettingsEffects();
}

function lastSave() {
  return allSlots().map((data, index) => ({ data, slot: index + 1 })).filter(item => item.data)
    .sort((a, b) => b.data.savedAt - a.data.savedAt)[0];
}

function renderSettingsEffects() {
  document.documentElement.classList.toggle('reduced-motion', !settings.motion);
  const soundButton = $('#sound-toggle');
  soundButton.innerHTML = settings.volume ? icon.sound : icon.mute;
  soundButton.setAttribute('aria-pressed', String(!settings.volume));
  audio.setVolume(settings.volume);
  world?.applySettings(settings);
}

function notify(message, graphic = 'check') {
  toast.innerHTML = icon[graphic] + '<span></span>';
  toast.lastElementChild.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTicker);
  toastTicker = setTimeout(() => { toast.hidden = true; }, 2900);
}

function setInput(enabled) {
  if (world) {
    world.inputEnabled = enabled;
    if (!enabled) world.resetInput();
  }
  if (!enabled) {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    cursorPointer = null;
    touchStick.classList.remove('active');
    touchStick.firstElementChild.style.transform = '';
  }
  hud.hidden = !enabled;
  if (enabled && (document.activeElement === document.body || overlay.contains(document.activeElement) || dialogueElement.contains(document.activeElement))) {
    canvas.focus({ preventScroll: true });
  }
}

function slotButtons() {
  return allSlots().map((data, index) => {
    const slot = index + 1;
    const chapter = data ? chapters[data.act] : null;
    return `<button type="button" class="slot-item" data-action="slot" data-slot="${slot}">
      <span class="slot-number">${slotNumber(slot)}</span>
      <span class="slot-text"><strong>${data ? escapeHtml(data.name) : 'Empty slot'}</strong><small>${data ? (data.completed ? 'Ending complete · ' : 'Chapter ' + numbers[data.act] + ' · ') + chapter.location : 'Create a journey here'}</small></span>
      <span class="slot-tail">${data ? icon.clock + timeLabel(data.seconds) : icon.plus}</span>
    </button>`;
  }).join('');
}

function panelMarkup(label, title, body, wider = false) {
  panelContent.classList.toggle('wide', wider);
  panelContent.classList.remove('ending-panel');
  panelContent.innerHTML = `<div class="panel-top"><div><p class="eyebrow">${label}</p><h2 id="panel-title">${title}</h2></div>
    <button class="top-btn modal-close" data-action="close" aria-label="Close">${icon.close}</button></div>${body}`;
}

function viewPanel(name, parent = null) {
  const alreadyOpen = !overlay.hidden;
  if (!alreadyOpen) menuOrigin = document.activeElement;
  const oldFocus = document.activeElement?.dataset.action;
  panel = { name, parent };
  overlay.hidden = false;
  $('#menu').inert = true;
  $('#play-screen').inert = true;
  setInput(false);

  if (name === 'slots') {
    panelMarkup('YOUR PROGRESS', menuPreference === 'new' ? 'New journey' : 'Load journey', '<div class="slot-list">' + slotButtons() + '</div>');
  } else if (name === 'create') {
    const existing = readSlot(chosenSlot);
    panelMarkup('SAVE SLOT ' + slotNumber(chosenSlot), existing ? 'Replace journey' : 'Name your journey', `
      ${existing ? '<p class="panel-description">This will replace <strong>' + escapeHtml(existing.name) + '</strong> and all progress in this slot.</p>' : '<p class="panel-description">Your progress saves here as you explore.</p>'}
      <form id="create-form" class="create-form"><label for="save-name">Journey name</label><input id="save-name" name="name" maxlength="28" placeholder="The Courier" autocomplete="off">
      <div class="panel-bottom"><button type="button" class="secondary-btn" data-action="show-slots">Back</button><button type="submit" class="gold-btn">${existing ? 'Replace & begin' : 'Begin journey'} ${icon.chevron}</button></div></form>`);
  } else if (name === 'settings') {
    panelMarkup('PREFERENCES', 'Settings', `<div class="settings-list">
      <label class="settings-row" for="volume"><span>Master volume<small>Music and sound effects</small></span><span class="range-control"><input type="range" id="volume" data-setting="volume" min="0" max="100" value="${Math.round(settings.volume * 100)}"><output>${Math.round(settings.volume * 100)}%</output></span></label>
      <label class="settings-row" for="sensitivity"><span>Look sensitivity<small>Mouse, drag, and keyboard turning</small></span><span class="range-control"><input type="range" id="sensitivity" data-setting="sensitivity" min="25" max="200" value="${Math.round(settings.sensitivity * 100)}"><output>${Math.round(settings.sensitivity * 100)}%</output></span></label>
      <label class="settings-row" for="textSpeed"><span>Dialogue speed</span><select id="textSpeed" data-setting="textSpeed">${['instant', 'steady', 'slow'].map(speed => option(speed, speed[0].toUpperCase() + speed.slice(1), settings.textSpeed)).join('')}</select></label>
      <label class="settings-row" for="quality"><span>3D quality</span><select id="quality" data-setting="quality">${option('high', 'High', settings.quality)}${option('low', 'Performance', settings.quality)}</select></label>
      <label class="settings-row" for="motion"><span>Ambient motion<small>Camera bob, drifting embers, and transitions</small></span><input id="motion" type="checkbox" data-setting="motion" ${settings.motion ? 'checked' : ''}></label>
      </div><div class="panel-bottom"><button class="text-btn" data-action="reset-settings">Restore defaults</button><button class="gold-btn" data-action="close">Done ${icon.check}</button></div>`);
  } else if (name === 'help') {
    panelMarkup('FIELD GUIDE', 'Controls', `<dl class="control-list">
      <div><dt>Move</dt><dd><kbd>W A S D</kbd> / touch stick</dd></div>
      <div><dt>Look</dt><dd>Drag / <kbd>← →</kbd> <kbd>PgUp PgDn</kbd></dd></div>
      <div><dt>Capture mouse look</dt><dd><kbd>M</kbd></dd></div>
      <div><dt>Move faster</dt><dd><kbd>SHIFT</kbd></dd></div>
      <div><dt>Talk / inspect</dt><dd><kbd>E</kbd> / interaction button</dd></div>
      <div><dt>Advance dialogue</dt><dd><kbd>SPACE</kbd> / <kbd>ENTER</kbd></dd></div>
      <div><dt>Choose a reply</dt><dd><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></dd></div>
      <div><dt>Journal / pause</dt><dd><kbd>J</kbd> / <kbd>ESC</kbd></dd></div>
      </dl><div class="panel-bottom"><button class="gold-btn" data-action="close">Done ${icon.check}</button></div>`);
  } else if (name === 'credits') {
    panelMarkup('ECHOES OF LANTERN VALE', 'Credits', `<div class="credits"><p>An original story, environment, and score for an unofficial 奶龙 fan game.</p>
      <p>Character artwork by <a href="https://www.meshy.ai/posts/%E5%A5%B6%E8%9B%99-01a19f9e-bf1b-77ff-b000-5f8fbf9835a7" target="_blank" rel="noreferrer">zeshentian1 · 奶蛙</a>. Original 奶龙 character IP by <a href="https://www.nailoong.com/" target="_blank" rel="noreferrer">Seventh Impression</a>.</p>
      <p>Lantern Vale key art and supporting portraits made with ImageGen. Built with Three.js, Web Audio, and Lucide icons.</p>
      <p><a href="https://github.com/Gavintool/echoes-of-lantern-vale" target="_blank" rel="noreferrer">View the GitHub repository</a></p></div>`);
  } else if (name === 'pause') {
    panelMarkup('CHAPTER ' + numbers[state.act] + ' · ' + chapters[state.act].location, 'Journey paused', `<div class="pause-actions">
      ${menuButton('close', 'play', 'Resume journey', 'Return to Lantern Vale', true)}
      ${menuButton('save', 'save', 'Save now', escapeHtml(state.name) + ' · Slot ' + slotNumber(activeSlot))}
      ${menuButton('journal', 'book', 'Journal', 'Read your discoveries')}
      ${menuButton('settings', 'settings', 'Settings', 'Audio, visuals & controls')}
      ${menuButton('help', 'keyboard', 'Controls', 'Keyboard and touch')}
      ${menuButton('title', 'back', 'Main menu', 'Save and leave the Vale')}
      </div>`);
  } else if (name === 'journal') {
    const current = chapters[state.act];
    panelMarkup(current.location, 'Field journal', `<div class="journal-layout"><div class="map-list">${chapters.map((chapter, i) =>
      `<div class="map-place ${i === state.act ? 'current' : ''}"><span>${i < state.act ? icon.check : numbers[i]}</span><div><small>CHAPTER ${numbers[i]}</small><strong>${chapter.location}</strong></div></div>`).join('')}</div>
      <div class="journal-entries"><p class="eyebrow">CURRENT OBJECTIVE</p><p>${current.task}</p><p class="eyebrow">DISCOVERIES</p>
      ${state.done.length ? state.done.map(id => `<article><strong>${discoveries[id][0]}</strong><p>${discoveries[id][1]}</p></article>`).join('') : '<p>Your notes will appear here as you explore.</p>'}
      </div></div>`, true);
  } else if (name === 'ending') {
    const outcome = outcomes[state.ending];
    const route = { yun: 'Yun', ren: 'Ren', friends: 'Yun & Ren' }[state.route];
    panelMarkup(outcome.subtitle, outcome.title, `<div class="ending-art" style="--landscape:url('${art('vale.webp')}')"><span>${icon.flame}</span></div>
      <p class="ending-caption">${outcome.caption}</p>
      <div class="ending-meta"><span>${icon.flag} 5 chapters completed</span><span>${icon.heart} ${route}</span><span>${icon.clock} ${timeLabel(state.seconds)}</span></div>
      <div class="panel-bottom"><button class="secondary-btn" data-action="title">Main menu</button><button class="gold-btn" data-action="new">New journey ${icon.chevron}</button></div>`);
    panelContent.classList.add('ending-panel');
  } else if (name === 'unsupported') {
    panelMarkup('LANTERN VALE', '3D could not start', '<p class="panel-description">The game needs WebGL 2 with hardware acceleration. Try opening the game in a current desktop browser.</p><div class="panel-bottom"><button class="gold-btn" data-action="title">Main menu</button></div>');
  }

  const focus = $('#save-name') ?? (alreadyOpen && oldFocus ? panelContent.querySelector(`[data-action="${oldFocus}"]`) : null) ?? panelContent;
  focus.focus({ preventScroll: true });
}

function option(value, title, selected) {
  return `<option value="${value}" ${selected === value ? 'selected' : ''}>${title}</option>`;
}

function closePanel() {
  if (panel?.name === 'create') return viewPanel('slots');
  if (panel?.name === 'ending' || panel?.name === 'unsupported') return returnToTitle();
  if (panel?.parent) return viewPanel(panel.parent);
  overlay.hidden = true;
  $('#menu').inert = false;
  $('#play-screen').inert = false;
  panel = null;
  if (mode === 'world') setInput(true);
  else if (mode === 'dialogue') {
    const control = $('#replies').hidden ? $('#dialogue-next') : $('#replies button');
    control?.focus({ preventScroll: true });
  }
  else if (document.contains(menuOrigin)) menuOrigin.focus({ preventScroll: true });
  else $('#menu-actions button')?.focus({ preventScroll: true });
}

function detectWorld() {
  if (!world) {
    try {
      world = new World(canvas, { settings, onFrame: updateHUD, onStep: () => audio.cue('step'),
        onContextLost: () => { persist(); notify('The graphics context was lost.', 'info'); viewPanel('unsupported'); } });
    } catch (error) {
      // A browser can still show the title and settings if WebGL is unavailable.
      console.warn('WebGL initialization failed', error);
      viewPanel('unsupported');
      return false;
    }
  }
  return true;
}

function beginJourney(data, slot, fresh = false) {
  if (!detectWorld()) return;
  state = data;
  activeSlot = slot;
  overlay.hidden = true;
  overlay.classList.remove('ending-backdrop');
  $('#menu').hidden = true;
  $('#menu').inert = false;
  $('#play-screen').hidden = false;
  $('#play-screen').inert = false;
  dialogueElement.hidden = true;
  panel = null;
  dialogue = null;
  elapsedCheckpoint = state.seconds;
  mode = 'world';
  world.load(state, true);
  world.active = true;
  world.resize();
  renderHUDChapter();
  audio.setMode('world');
  if (state.completed) {
    showEnding();
    return;
  }
  setInput(true);
  canvas.focus({ preventScroll: true });
  if (fresh) {
    const saved = persist(false);
    showChapter();
    notify(saved ? 'Journey created · Slot ' + slotNumber(slot) : 'Storage unavailable. Progress will only last this session.', saved ? 'save' : 'info');
  }
}

function persist(report = false) {
  if (!state || !activeSlot) return false;
  if (world && (mode === 'world' || mode === 'dialogue')) state = { ...state, ...world.transform() };
  elapsedCheckpoint = state.seconds;
  const saved = saveSlot(activeSlot, state);
  if (report) notify(saved ? 'Journey saved · Slot ' + slotNumber(activeSlot) : 'The browser could not save this journey.', saved ? 'save' : 'info');
  return saved;
}

function returnToTitle() {
  if (state) persist();
  clearTimeout(textTicker);
  clearTimeout(transitionTicker);
  chapterCard.hidden = true;
  setInput(false);
  if (world) world.active = false;
  state = null;
  activeSlot = null;
  closest = null;
  dialogue = null;
  dialogueElement.hidden = true;
  overlay.classList.remove('ending-backdrop');
  overlay.hidden = true;
  $('#play-screen').hidden = true;
  $('#play-screen').inert = false;
  $('#menu').hidden = false;
  $('#menu').inert = false;
  mode = 'menu';
  panel = null;
  audio.setMode('menu');
  renderMenu();
  $('#menu-actions button')?.focus({ preventScroll: true });
}

function renderHUDChapter() {
  const chapter = chapters[state.act];
  $('#hud-chapter').textContent = 'CHAPTER ' + numbers[state.act] + ' / ' + chapter.location;
  $('#hud-objective').textContent = chapter.task;
  $('#walk-tip').hidden = state.act !== 0;
  closest = null;
  beacon.hidden = true;
  interact.hidden = true;
}

function updateHUD(dt, target, projection) {
  state.seconds += dt;
  if (state.seconds - elapsedCheckpoint > 15) persist();
  if (target?.id !== closest?.id) {
    beacon.querySelector('strong').textContent = target?.title ?? '';
    interact.lastElementChild.textContent = target ? target.type + ' ' + target.title : '';
  }
  closest = target;
  beacon.hidden = !projection || target.distance < 2.5;
  if (projection && target.distance >= 2.5) {
    beacon.style.left = projection[0] * 100 + '%';
    beacon.style.top = projection[1] * 100 + '%';
    beacon.querySelector('small').textContent = Math.ceil(target.distance) + ' m';
  }
  interact.hidden = !target || target.distance >= 2.55;
}

function showChapter() {
  const chapter = chapters[state.act];
  chapterCard.innerHTML = '<p class="eyebrow">CHAPTER ' + numbers[state.act] + '</p><h2>' + chapter.title + '</h2><span>' + chapter.location + '</span>';
  chapterCard.hidden = false;
  clearTimeout(transitionTicker);
  transitionTicker = setTimeout(() => { chapterCard.hidden = true; }, settings.motion ? 3150 : 1600);
}

function startDialogue() {
  if (mode !== 'world' || panel) return;
  const target = world.nearest();
  if (!target || target.distance >= 2.55) return;
  setInput(false);
  chapterCard.hidden = true;
  mode = 'dialogue';
  dialogue = { id: target.id, lines: [...sceneFor(target.id, state)], index: 0, draft: state, history: [], log: false };
  dialogueElement.hidden = false;
  if (target.actor === 'bao') audio.cue('laugh');
  else audio.cue('chime');
  renderLine();
}

function renderLine() {
  const item = dialogue.lines[dialogue.index];
  const speaker = cast[item.speaker];
  dialogue.history.push([speaker.name, item.text]);
  const portrait = speaker.portrait && art(speaker.portrait + '.webp');
  const speakerName = item.speaker === 'courier' && state.name !== 'The Courier' ? state.name : speaker.name;
  dialogueElement.innerHTML = `
    ${portrait ? `<div class="portrait-stage ${speaker.portrait === 'milk-dragon' ? 'mascot-portrait' : ''}"><img src="${portrait}" alt="${speaker.name}"></div>` : ''}
    <div class="dialogue-box">
      <header><div class="speaker"><strong>${escapeHtml(speakerName)}</strong><span lang="zh-Hans">${speaker.han}</span></div><button type="button" class="text-btn log-toggle" data-action="log">${icon.book} History</button></header>
      <div class="dialogue-text" id="line-text"></div>
      <div id="replies" class="replies" hidden>${item.choices?.map((reply, i) => `<button data-action="choose" data-choice="${i}" type="button"><kbd>${i + 1}</kbd> ${escapeHtml(reply.text)}</button>`).join('') ?? ''}</div>
      <div class="dialogue-footer"><span>${escapeHtml(speaker.role)}</span><button id="dialogue-next" class="text-btn" data-action="advance" type="button">Continue ${icon.chevron}</button></div>
      <div id="history" class="history" hidden></div>
    </div>`;
  const text = $('#line-text');
  text.setAttribute('aria-label', item.text);
  let index = 0;
  const reveal = () => {
    clearTimeout(textTicker);
    text.textContent = item.text;
    dialogue.typing = false;
    if (item.choices) {
      $('#replies').hidden = false;
      $('#dialogue-next').hidden = true;
    }
  };
  dialogue.reveal = reveal;
  dialogue.typing = settings.textSpeed !== 'instant';
  const tick = () => {
    index += settings.textSpeed === 'slow' ? 1 : 3;
    text.textContent = item.text.slice(0, index);
    if (index >= item.text.length) reveal();
    else textTicker = setTimeout(tick, settings.textSpeed === 'slow' ? 27 : 21);
  };
  if (dialogue.typing) tick();
  else reveal();
}

function advance(choseReply = false) {
  if (mode !== 'dialogue' || panel || dialogue.log) return;
  if (dialogue.typing) return dialogue.reveal();
  if (dialogue.lines[dialogue.index].choices && !choseReply) return;
  dialogue.index++;
  if (dialogue.index < dialogue.lines.length) return renderLine();
  const before = state.act;
  state = finishScene({ ...dialogue.draft, seconds: state.seconds }, dialogue.id);
  const changed = state.act !== before;
  dialogue = null;
  dialogueElement.hidden = true;
  if (state.completed) {
    persist();
    showEnding();
    return;
  }
  mode = 'world';
  world.load(state, changed);
  persist();
  renderHUDChapter();
  setInput(true);
  canvas.focus({ preventScroll: true });
  if (changed) showChapter();
}

function choose(index) {
  if (mode !== 'dialogue' || panel || dialogue.log || dialogue.typing) return;
  const reply = dialogue.lines[dialogue.index].choices?.[index];
  if (!reply) return;
  dialogue.draft = applyChoice(dialogue.draft, reply);
  dialogue.lines.splice(dialogue.index + 1, 0, ...reply.replies);
  if (dialogue.id === 'broadcast') audio.cue('laugh');
  advance(true);
}

function showEnding() {
  mode = 'ending';
  dialogueElement.hidden = true;
  overlay.classList.add('ending-backdrop');
  audio.cue('chime');
  viewPanel('ending');
}

function toggleHistory() {
  if (!dialogue) return;
  dialogue.log = !dialogue.log;
  const history = $('#history');
  history.hidden = !dialogue.log;
  if (dialogue.log) {
    history.innerHTML = dialogue.history.map(([name, text]) => '<p><strong>' + escapeHtml(name) + '</strong> ' + escapeHtml(text) + '</p>').join('');
    history.scrollTop = history.scrollHeight;
  }
}

function toggleSound() {
  settings = { ...settings, volume: settings.volume > 0 ? 0 : defaultSettings.volume };
  saveSettings(settings);
  renderSettingsEffects();
  notify(settings.volume ? 'Audio on' : 'Audio muted', settings.volume ? 'sound' : 'mute');
}

function takeAction(action, button) {
  switch (action) {
    case 'new':
    case 'load':
      if (mode === 'ending') returnToTitle();
      menuPreference = action;
      viewPanel('slots');
      break;
    case 'continue': {
      const latest = lastSave();
      if (latest) beginJourney(latest.data, latest.slot);
      break;
    }
    case 'show-slots': viewPanel('slots'); break;
    case 'slot': {
      chosenSlot = Number(button.dataset.slot);
      const data = readSlot(chosenSlot);
      if (menuPreference === 'load' && data) beginJourney(data, chosenSlot);
      else viewPanel('create');
      break;
    }
    case 'settings':
    case 'help':
    case 'credits':
    case 'journal':
      viewPanel(action, panel?.name === 'pause' ? 'pause' : null);
      break;
    case 'reset-settings':
      settings = { ...defaultSettings };
      saveSettings(settings);
      renderSettingsEffects();
      viewPanel('settings', panel?.parent);
      break;
    case 'close': closePanel(); break;
    case 'sound': toggleSound(); break;
    case 'pause': viewPanel('pause'); break;
    case 'title': returnToTitle(); break;
    case 'save': persist(true); break;
    case 'interact': startDialogue(); break;
    case 'advance': advance(); break;
    case 'choose': choose(Number(button.dataset.choice)); break;
    case 'log': toggleHistory(); break;
  }
}

app.addEventListener('click', event => {
  if (event.target === overlay && panel?.name !== 'ending') closePanel();
  const button = event.target.closest('[data-action]');
  if (!button) return;
  audio.start().catch(() => {});
  takeAction(button.dataset.action, button);
});

app.addEventListener('submit', event => {
  if (event.target.id !== 'create-form') return;
  event.preventDefault();
  beginJourney(newJourney(new FormData(event.target).get('name') ?? ''), chosenSlot, true);
});

app.addEventListener('input', event => {
  const control = event.target;
  const key = control.dataset.setting;
  if (!key) return;
  const value = control.type === 'range' ? Number(control.value) / 100 : control.type === 'checkbox' ? control.checked : control.value;
  settings = { ...settings, [key]: value };
  if (control.type === 'range') control.nextElementSibling.value = control.value + '%';
  saveSettings(settings);
  renderSettingsEffects();
});

document.addEventListener('keydown', event => {
  if (panel) {
    if (event.code === 'Escape') {
      event.preventDefault();
      closePanel();
    } else if (event.key === 'Tab') {
      const items = [...panelContent.querySelectorAll('button:not([hidden]), a, input, select')];
      if (items.length && (event.shiftKey && !items.includes(document.activeElement) ||
        event.shiftKey && document.activeElement === items[0] ||
        !event.shiftKey && document.activeElement === items.at(-1))) {
        event.preventDefault();
        items[event.shiftKey ? items.length - 1 : 0].focus();
      }
    }
    return;
  }
  if (mode === 'dialogue') {
    if (event.repeat) return;
    if (event.code === 'Escape') {
      if (dialogue.log) toggleHistory();
      else viewPanel('pause');
    } else if (['Space', 'Enter'].includes(event.code) && !event.target.closest('button')) {
      event.preventDefault();
      advance();
    } else if (/^(Digit|Numpad)[1-3]$/.test(event.code)) choose(Number(event.code.at(-1)) - 1);
    return;
  }
  if (mode !== 'world' || !world?.inputEnabled) return;
  if (blockedKeyCodes.has(event.code) && !event.target.closest('button')) event.preventDefault();
  world.keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Escape') viewPanel('pause');
  if (event.code === 'KeyJ') viewPanel('journal');
  if (event.code === 'KeyE') startDialogue();
  if (event.code === 'KeyM') {
    try {
      const lock = canvas.requestPointerLock?.();
      lock?.catch(() => notify('Drag the view to look around.', 'mouse'));
    } catch {
      notify('Drag the view to look around.', 'mouse');
    }
  }
});
document.addEventListener('keyup', event => world?.keys.delete(event.code));
window.addEventListener('blur', () => world?.resetInput());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state) persist();
});
window.addEventListener('pagehide', () => { if (state) persist(); });

canvas.addEventListener('pointerdown', event => {
  if (!world?.inputEnabled || document.pointerLockElement === canvas || cursorPointer !== null) return;
  cursorPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.focus({ preventScroll: true });
});
canvas.addEventListener('pointermove', event => {
  if (cursorPointer?.id !== event.pointerId) return;
  world?.look(event.clientX - cursorPointer.x, event.clientY - cursorPointer.y);
  cursorPointer.x = event.clientX;
  cursorPointer.y = event.clientY;
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(eventName, event => {
  if (cursorPointer?.id === event.pointerId) cursorPointer = null;
});
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement === canvas) world?.look(event.movementX, event.movementY);
});

let stickPointer = null;
function moveStick(event) {
  if (event.pointerId !== stickPointer || !world?.inputEnabled) return;
  const rect = touchStick.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const radius = rect.width * 0.37;
  const divisor = Math.max(radius, Math.hypot(x, y));
  world.dir.set(x / divisor, y / divisor);
  touchStick.firstElementChild.style.transform = `translate(${world.dir.x * radius}px, ${world.dir.y * radius}px)`;
}
touchStick.addEventListener('pointerdown', event => {
  stickPointer = event.pointerId;
  touchStick.setPointerCapture(event.pointerId);
  touchStick.classList.add('active');
  moveStick(event);
});
touchStick.addEventListener('pointermove', moveStick);
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) touchStick.addEventListener(eventName, () => {
  stickPointer = null;
  world?.dir.set(0, 0);
  touchStick.classList.remove('active');
  touchStick.firstElementChild.style.transform = '';
});

renderMenu();
