import './style.css';
import { World } from './world.js';
import { Soundscape } from './audio.js';
import { icon } from './icons.js';
import { art } from './media.js';
import { allSlots, defaultSettings, newJourney, readSettings, readSlot, saveSettings, saveSlot, timeLabel } from './save.js';
import { applyChoice, cast, chapters, discoveries, finishScene, outcomes, sceneFor } from './story.js';

const app = document.querySelector('#app');
const $ = selector => app.querySelector(selector);
const numbers = ['一', '二', '三', '四', '五'];
const chapterLabel = act => '第' + numbers[act] + '章';
const blockedKeyCodes = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const slotNumber = value => String(value).padStart(2, '0');
const particles = Array.from({ length: 26 }, (_, i) => {
  const seed = i * 37 + 11;
  return `<i style="--x:${(seed * 13) % 100}%;--y:${(seed * 79) % 100}%;--s:${2 + seed % 5}px;--duration:${8 + seed % 11}s;--delay:-${seed % 19}s"></i>`;
}).join('');

let settings = readSettings();
let audio = new Soundscape(settings);
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
let mixUpdate = 0;
let unmutedVolume = settings.volume || defaultSettings.volume;
let menuPreference = 'load';

app.innerHTML = `
<div id="menu" class="menu-screen">
  <div class="menu-landscape" style="--landscape:url('${art('vale.webp')}')"></div>
  <div class="menu-flare"></div>
  <div class="embers" aria-hidden="true">${particles}</div>
  <figure class="hero-dragon" aria-hidden="true"><img src="${art('milk-dragon.webp')}" alt=""></figure>
  <div class="menu-layout">
    <header class="menu-header">
      <div class="studio-brand"><span class="brand-icon">${icon.flame}</span><span>灯谷故事</span></div>
      <div class="top-tools"><button type="button" class="top-btn" data-action="help" aria-label="操作指南" title="操作指南">${icon.keyboard}</button><button type="button" class="top-btn" data-action="sound" aria-label="开关声音" title="开关声音" id="sound-toggle">${icon.sound}</button></div>
    </header>
    <section class="menu-content" aria-labelledby="game-title">
      <p class="eyebrow title-eyebrow"><span></span> 奶龙同人游戏</p>
      <h1 id="game-title">灯谷<span>回声</span></h1>
      <p class="menu-description">整座灯谷突然失了声，只剩一声响亮的笑。</p>
      <nav class="menu-actions" aria-label="主菜单" id="menu-actions"></nav>
    </section>
    <footer class="menu-footer">
      <span class="audio-note">${icon.headphones} 建议佩戴耳机</span>
      <span class="build-note">第一人称剧情冒险 <span>·</span> 1.1</span>
    </footer>
  </div>
</div>
<section id="play-screen" class="play-screen" hidden aria-label="三维探索">
  <canvas id="world" aria-label="灯谷第一人称视角" tabindex="-1"></canvas>
  <div class="world-vignette"></div>
  <div class="hud" id="hud" hidden>
    <div class="quest"><span class="quest-icon">${icon.compass}</span><div><p class="eyebrow" id="hud-chapter"></p><h2 id="hud-objective"></h2></div></div>
    <div class="hud-tools"><button class="top-btn" data-action="journal" aria-label="手记" title="手记（J）">${icon.book}</button><button class="top-btn" data-action="pause" aria-label="暂停" title="暂停（Esc）">${icon.pause}</button></div>
    <span class="reticle" aria-hidden="true"></span>
    <div id="beacon" class="beacon" hidden><span aria-hidden="true"></span><strong></strong><small></small></div>
    <button id="interact" data-action="interact" class="interaction" type="button" hidden><kbd>E</kbd><span></span></button>
    <div class="walk-tip" id="walk-tip"><kbd>W A S D</kbd> 移动 <span>·</span> 拖动视角 <span>·</span> <kbd>E</kbd> 互动</div>
    <div id="touch-stick" class="touch-stick" aria-label="触屏移动"><span></span></div>
  </div>
  <section id="dialogue" class="dialogue" aria-label="剧情对白" hidden></section>
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
      ? menuButton('continue', 'play', '继续游戏', escapeHtml(latest.data.name) + ' · ' + (latest.data.completed ? '已通关' : chapterLabel(latest.data.act)), true)
      : menuButton('new', 'play', '开始旅程', '从归渡桥开始', true),
    latest ? menuButton('new', 'sparkles', '新旅程', '创建新存档') : '',
    menuButton('load', 'folder', '读取存档', latest ? '继续以前的故事' : '查看存档位置'),
    menuButton('settings', 'settings', '设置', '声音、画面与操作'),
    menuButton('credits', 'info', '制作与鸣谢', '作者、素材与技术'),
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
  audio.setSettings(settings);
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
      <span class="slot-text"><strong>${data ? escapeHtml(data.name) : '空存档'}</strong><small>${data ? (data.completed ? '已通关 · ' : chapterLabel(data.act) + ' · ') + chapter.location : '在这里新建旅程'}</small></span>
      <span class="slot-tail">${data ? icon.clock + timeLabel(data.seconds) : icon.plus}</span>
    </button>`;
  }).join('');
}

function panelMarkup(label, title, body, wider = false) {
  panelContent.classList.toggle('wide', wider);
  panelContent.classList.remove('ending-panel');
  panelContent.innerHTML = `<div class="panel-top"><div><p class="eyebrow">${label}</p><h2 id="panel-title">${title}</h2></div>
    <button class="top-btn modal-close" data-action="close" aria-label="关闭">${icon.close}</button></div>${body}`;
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
  audio.stopVoice();

  if (name === 'slots') {
    panelMarkup('旅程进度', menuPreference === 'new' ? '新旅程' : '读取存档', '<div class="slot-list">' + slotButtons() + '</div>');
  } else if (name === 'create') {
    const existing = readSlot(chosenSlot);
    panelMarkup('存档位 ' + slotNumber(chosenSlot), existing ? '覆盖旅程' : '为旅程命名', `
      ${existing ? '<p class="panel-description">此操作将覆盖 <strong>' + escapeHtml(existing.name) + '</strong> 的存档和进度。</p>' : '<p class="panel-description">探索期间，进度会自动保存到这里。</p>'}
      <form id="create-form" class="create-form"><label for="save-name">旅程名称</label><input id="save-name" name="name" maxlength="28" placeholder="信使奶龙" autocomplete="off">
      <div class="panel-bottom"><button type="button" class="secondary-btn" data-action="show-slots">返回</button><button type="submit" class="gold-btn">${existing ? '覆盖并开始' : '开始旅程'} ${icon.chevron}</button></div></form>`);
  } else if (name === 'settings') {
    panelMarkup('游戏选项', '设置', `<div class="settings-list">
      ${volumeSlider('volume', '总音量')}
      ${volumeSlider('voiceVolume', '角色配音', '普通话对白与旁白')}
      ${volumeSlider('musicVolume', '背景音乐')}
      ${volumeSlider('effectsVolume', '环境与音效', '河水、风铃、脚步和剧情音效')}
      <label class="settings-row" for="sensitivity"><span>视角灵敏度<small>鼠标、触屏和键盘转向</small></span><span class="range-control"><input type="range" id="sensitivity" data-setting="sensitivity" min="25" max="200" value="${Math.round(settings.sensitivity * 100)}"><output>${Math.round(settings.sensitivity * 100)}%</output></span></label>
      <label class="settings-row" for="textSpeed"><span>字幕速度</span><select id="textSpeed" data-setting="textSpeed">${Object.entries({ instant: '立即显示', steady: '适中', slow: '慢速' }).map(([speed, title]) => option(speed, title, settings.textSpeed)).join('')}</select></label>
      <label class="settings-row" for="quality"><span>三维画质</span><select id="quality" data-setting="quality">${option('high', '高画质', settings.quality)}${option('low', '流畅模式', settings.quality)}</select></label>
      <label class="settings-row" for="motion"><span>环境动画<small>走路起伏、飘落的火星和转场</small></span><input id="motion" type="checkbox" data-setting="motion" ${settings.motion ? 'checked' : ''}></label>
      </div><div class="panel-bottom"><button class="text-btn" data-action="reset-settings">恢复默认</button><button class="gold-btn" data-action="close">完成 ${icon.check}</button></div>`);
  } else if (name === 'help') {
    panelMarkup('游玩指南', '操作指南', `<dl class="control-list">
      <div><dt>移动</dt><dd><kbd>W A S D</kbd> / 触屏摇杆</dd></div>
      <div><dt>转动视角</dt><dd>拖动 / <kbd>← →</kbd> <kbd>PgUp PgDn</kbd></dd></div>
      <div><dt>锁定鼠标视角</dt><dd><kbd>M</kbd></dd></div>
      <div><dt>加速移动</dt><dd><kbd>SHIFT</kbd></dd></div>
      <div><dt>交谈或查看</dt><dd><kbd>E</kbd> / 互动按钮</dd></div>
      <div><dt>推进对白</dt><dd><kbd>SPACE</kbd> / <kbd>ENTER</kbd></dd></div>
      <div><dt>选择回答</dt><dd><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></dd></div>
      <div><dt>手记或暂停</dt><dd><kbd>J</kbd> / <kbd>ESC</kbd></dd></div>
      </dl><div class="panel-bottom"><button class="gold-btn" data-action="close">完成 ${icon.check}</button></div>`);
  } else if (name === 'credits') {
    panelMarkup('灯谷回声', '制作与鸣谢', `<div class="credits"><p>奶龙同人游戏。灯谷的剧情、场景及配乐为本作原创。</p>
      <p>主角素材由 <a href="https://www.meshy.ai/posts/%E5%A5%B6%E8%9B%99-01a19f9e-bf1b-77ff-b000-5f8fbf9835a7" target="_blank" rel="noreferrer">zeshentian1</a> 提供。奶龙原作由 <a href="https://www.nailoong.com/" target="_blank" rel="noreferrer">第七印象</a> 创作。</p>
      <p>其他奶龙立绘基于参考照片制作。普通话配音由 Kokoro 合成。详见 <a href="https://github.com/Gavintool/echoes-of-lantern-vale/blob/main/docs/ASSETS.md" target="_blank" rel="noreferrer">素材与音频来源</a>。</p>
      <p><a href="https://github.com/Gavintool/echoes-of-lantern-vale" target="_blank" rel="noreferrer">查看 GitHub 项目</a></p></div>`);
  } else if (name === 'pause') {
    panelMarkup(chapterLabel(state.act) + ' · ' + chapters[state.act].location, '旅程暂停', `<div class="pause-actions">
      ${menuButton('close', 'play', '继续旅程', '回到灯谷', true)}
      ${menuButton('save', 'save', '保存进度', escapeHtml(state.name) + ' · 存档位 ' + slotNumber(activeSlot))}
      ${menuButton('journal', 'book', '手记', '查看沿途的发现')}
      ${menuButton('settings', 'settings', '设置', '声音、画面与操作')}
      ${menuButton('help', 'keyboard', '操作指南', '键盘与触屏操作')}
      ${menuButton('title', 'back', '主菜单', '保存后返回标题')}
      </div>`);
  } else if (name === 'journal') {
    const current = chapters[state.act];
    panelMarkup(current.location, '随身手记', `<div class="journal-layout"><div class="map-list">${chapters.map((chapter, i) =>
      `<div class="map-place ${i === state.act ? 'current' : ''}"><span>${i < state.act ? icon.check : numbers[i]}</span><div><small>${chapterLabel(i)}</small><strong>${chapter.location}</strong></div></div>`).join('')}</div>
      <div class="journal-entries"><p class="eyebrow">当前目标</p><p>${current.task}</p><p class="eyebrow">沿途发现</p>
      ${state.done.length ? state.done.map(id => `<article><strong>${discoveries[id][0]}</strong><p>${discoveries[id][1]}</p></article>`).join('') : '<p>沿途的发现会记在这里。</p>'}
      </div></div>`, true);
  } else if (name === 'ending') {
    const outcome = outcomes[state.ending];
    const route = { yun: cast.yun.name, ren: cast.ren.name, friends: '青音奶龙与灯穗奶龙' }[state.route];
    panelMarkup(outcome.subtitle, outcome.title, `<div class="ending-art" style="--landscape:url('${art('vale.webp')}')"><span>${icon.flame}</span></div>
      <p class="ending-caption">${outcome.caption}</p>
      <div class="ending-meta"><span>${icon.flag} 已完成五章</span><span>${icon.heart} ${route}</span><span>${icon.clock} ${timeLabel(state.seconds)}</span></div>
      <div class="panel-bottom"><button class="secondary-btn" data-action="title">主菜单</button><button class="gold-btn" data-action="new">新旅程 ${icon.chevron}</button></div>`);
    panelContent.classList.add('ending-panel');
  } else if (name === 'unsupported') {
    panelMarkup('灯谷回声', '无法启动三维画面', '<p class="panel-description">游戏需要支持 WebGL 2 和硬件加速的浏览器。请试试最新版桌面浏览器。</p><div class="panel-bottom"><button class="gold-btn" data-action="title">主菜单</button></div>');
  }

  const focus = $('#save-name') ?? (alreadyOpen && oldFocus ? panelContent.querySelector(`[data-action="${oldFocus}"]`) : null) ?? panelContent;
  focus.focus({ preventScroll: true });
}

function volumeSlider(key, label, detail = '') {
  const percent = Math.round(settings[key] * 100);
  return `<label class="settings-row" for="${key}"><span>${label}${detail ? '<small>' + detail + '</small>' : ''}</span>
    <span class="range-control"><input type="range" id="${key}" data-setting="${key}" min="0" max="100" value="${percent}"><output>${percent}%</output></span></label>`;
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
        onContextLost: () => { persist(); notify('图形连接中断，进度已尝试保存。', 'info'); viewPanel('unsupported'); } });
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
  world.dialogueActive = false;
  world.resize();
  renderHUDChapter();
  audio.setMode('world', state.act);
  if (state.completed) {
    showEnding();
    return;
  }
  setInput(true);
  canvas.focus({ preventScroll: true });
  audio.prime(sceneFor('arrival', state).slice(0, 2));
  if (fresh) {
    const saved = persist(false);
    showChapter();
    notify(saved ? '旅程已创建 · 存档位 ' + slotNumber(slot) : '无法使用浏览器存储，进度仅在本次游玩有效。', saved ? 'save' : 'info');
  }
}

function persist(report = false) {
  if (!state || !activeSlot) return false;
  if (world && (mode === 'world' || mode === 'dialogue')) state = { ...state, ...world.transform() };
  elapsedCheckpoint = state.seconds;
  const saved = saveSlot(activeSlot, state);
  if (report) notify(saved ? '旅程已保存 · 存档位 ' + slotNumber(activeSlot) : '浏览器未能保存当前旅程。', saved ? 'save' : 'info');
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
  audio.stopVoice();
  audio.setMode('menu');
  renderMenu();
  $('#menu-actions button')?.focus({ preventScroll: true });
}

function renderHUDChapter() {
  const chapter = chapters[state.act];
  $('#hud-chapter').textContent = chapterLabel(state.act) + ' / ' + chapter.location;
  $('#hud-objective').textContent = chapter.task;
  $('#walk-tip').hidden = state.act !== 0;
  closest = null;
  beacon.hidden = true;
  interact.hidden = true;
}

function updateHUD(dt, target, projection) {
  state.seconds += dt;
  mixUpdate += dt;
  if (mixUpdate > 0.14) {
    mixUpdate = 0;
    audio.updatePosition(world.position.x, world.position.z, world.view.x);
  }
  if (state.seconds - elapsedCheckpoint > 15) persist();
  if (target?.id !== closest?.id) {
    beacon.querySelector('strong').textContent = target?.title ?? '';
    beacon.classList.toggle('optional-beacon', Boolean(target?.optional));
    interact.lastElementChild.textContent = target ? (target.type.includes('%s') ? target.type.replace('%s', target.title) : target.type + target.title) : '';
  }
  closest = target;
  beacon.hidden = !projection || target.distance < 2.5;
  if (projection && target.distance >= 2.5) {
    beacon.style.left = projection[0] * 100 + '%';
    beacon.style.top = projection[1] * 100 + '%';
    beacon.querySelector('small').textContent = Math.ceil(target.distance) + ' 米';
  }
  interact.hidden = !target || target.distance >= 2.55;
}

function showChapter() {
  const chapter = chapters[state.act];
  chapterCard.innerHTML = '<p class="eyebrow">' + chapterLabel(state.act) + '</p><h2>' + chapter.title + '</h2><span>' + chapter.location + '</span>';
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
  world.dialogueActive = true;
  dialogue = { id: target.id, lines: [...sceneFor(target.id, state)], index: 0, draft: state, history: [], log: false };
  dialogueElement.hidden = false;
  audio.cue(target.optional ? 'windbell' : 'chime', 0, 0.36);
  renderLine();
}

function renderLine() {
  const item = dialogue.lines[dialogue.index];
  const speaker = cast[item.speaker];
  const portrait = speaker.portrait && art(speaker.portrait + '.webp');
  const speakerName = item.speaker === 'courier' && state.name !== '信使奶龙' ? state.name + ' · 信使奶龙' : speaker.name;
  dialogue.history.push([speakerName, item.text]);
  dialogueElement.innerHTML = `
    ${portrait ? `<div class="portrait-stage ${item.speaker === 'echo' ? 'echo-portrait' : ''}"><img src="${portrait}" alt="${speaker.name}"></div>` : ''}
    <div class="dialogue-box">
      <header><div class="speaker"><strong>${escapeHtml(speakerName)}</strong></div><div class="dialogue-tools"><button type="button" class="text-btn replay-btn" data-action="replay" title="重听当前台词">${icon.sound} 重听</button><button type="button" class="text-btn log-toggle" data-action="log">${icon.book} 回顾</button></div></header>
      <div class="dialogue-text" id="line-text"></div>
      <div id="replies" class="replies" hidden>${item.choices?.map((reply, i) => `<button data-action="choose" data-choice="${i}" type="button"><kbd>${i + 1}</kbd> ${escapeHtml(reply.text)}</button>`).join('') ?? ''}</div>
      <div class="dialogue-footer"><span>${escapeHtml(speaker.role)}</span><button id="dialogue-next" class="text-btn" data-action="advance" type="button">继续 ${icon.chevron}</button></div>
      <div id="history" class="history" hidden></div>
    </div>`;
  const text = $('#line-text');
  text.setAttribute('aria-label', item.text);
  if (item.cue) audio.cue(item.cue, 0, item.cue.includes('laugh') ? 0.64 : 0.53);
  replayVoice();
  audio.prime([dialogue.lines[dialogue.index + 1], dialogue.lines[dialogue.index + 2],
    ...(item.choices ?? []).map(reply => reply.replies[0])]);
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
  audio.stopVoice();
  world.dialogueActive = false;
  dialogueElement.hidden = true;
  if (state.completed) {
    persist();
    showEnding();
    return;
  }
  mode = 'world';
  world.load(state, changed);
  audio.setMode('world', state.act);
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
  advance(true);
}

function showEnding() {
  mode = 'ending';
  dialogueElement.hidden = true;
  overlay.classList.add('ending-backdrop');
  audio.setMode('ending', state.act);
  audio.cue('dawn');
  viewPanel('ending');
}

function replayVoice() {
  if (!dialogue || panel || dialogue.log) return;
  const button = $('.replay-btn');
  audio.speak(dialogue.lines[dialogue.index], playing => button?.classList.toggle('is-speaking', playing));
}

function toggleHistory() {
  if (!dialogue) return;
  dialogue.log = !dialogue.log;
  const history = $('#history');
  history.hidden = !dialogue.log;
  if (dialogue.log) {
    audio.stopVoice();
    history.innerHTML = dialogue.history.map(([name, text]) => '<p><strong>' + escapeHtml(name) + '</strong> ' + escapeHtml(text) + '</p>').join('');
    history.scrollTop = history.scrollHeight;
  }
}

function toggleSound() {
  if (settings.volume > 0) {
    unmutedVolume = settings.volume;
    settings = { ...settings, volume: 0 };
  } else settings = { ...settings, volume: unmutedVolume };
  saveSettings(settings);
  renderSettingsEffects();
  notify(settings.volume ? '声音已开启' : '已静音', settings.volume ? 'sound' : 'mute');
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
    case 'replay': replayVoice(); break;
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
      lock?.catch(() => notify('可以拖动画面转动视角。', 'mouse'));
    } catch {
      notify('可以拖动画面转动视角。', 'mouse');
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
