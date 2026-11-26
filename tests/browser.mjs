import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  channel: process.env.LANTERN_CHROME_CHANNEL || 'chrome',
  headless: true,
  args: ['--enable-webgl', '--enable-unsafe-swiftshader'],
});
const url = process.env.LANTERN_TEST_URL || 'http://127.0.0.1:5173/';
const page = await browser.newPage({ viewport: { width: 1050, height: 680 } });
const failures = [];
page.on('pageerror', error => failures.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && response.url().startsWith(url)) failures.push(response.status() + ' ' + response.url());
});

async function walk(title, strafe = null, milliseconds = 660) {
  if (strafe) {
    await page.keyboard.down(strafe);
    await page.waitForTimeout(milliseconds);
    await page.keyboard.up(strafe);
  }
  const button = page.getByRole('button', { name: new RegExp(title) });
  await page.keyboard.down('w');
  try {
    await button.waitFor({ state: 'visible', timeout: 14500 });
  } finally {
    await page.keyboard.up('w');
  }
  await page.keyboard.press('e');
  await page.locator('#dialogue').waitFor({ state: 'visible' });
}

async function playScene(reply = 1) {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('#dialogue').isHidden()) return;
    if (await page.locator('#replies').isVisible()) await page.keyboard.press(String(reply));
    else await page.locator('#dialogue-next').click();
  }
  assert.fail('Scene did not finish');
}

try {
  await page.goto(url);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hans');
  await page.getByRole('heading', { name: '灯谷回声' }).waitFor();
  await page.getByRole('button', { name: /设置/ }).click();
  await page.getByLabel('字幕速度').selectOption('instant');
  await page.getByLabel('三维画质').selectOption('low');
  await page.getByLabel('环境动画').uncheck();
  await page.getByRole('button', { name: '完成' }).click();

  await page.getByRole('button', { name: /开始旅程/ }).click();
  await page.getByRole('button', { name: /01 空存档/ }).click();
  await page.getByLabel('旅程名称').fill('Harbor');
  await page.getByRole('button', { name: '开始旅程', exact: true }).click();

  await walk('和奶龙说话');
  await page.locator('.replay-btn.is-speaking').waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: '重听' }).click();
  await page.locator('.replay-btn.is-speaking').waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: '回顾' }).click();
  await page.locator('#history').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await playScene();

  await walk('和青音奶龙说话', 'a');
  await page.getByRole('img', { name: '青音奶龙' }).waitFor();
  await playScene();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /保存进度/ }).click();
  await page.reload();
  await page.getByRole('button', { name: /继续游戏.*Harbor/ }).click();
  await page.keyboard.press('j');
  await page.getByText('分音器', { exact: true }).waitFor();
  await page.keyboard.press('Escape');

  await walk('和灯穗奶龙说话', 'd', 1300);
  await playScene();
  await walk('聆听蜡筒录音', 'a');
  await playScene();

  await page.keyboard.press('j');
  await page.getByText('低河鸣 → 两次呼吸 → 高钟。').waitFor();
  await page.getByRole('button', { name: '关闭' }).click();
  await walk('调音 · 灯风琴', 'd', 1300);
  await playScene(2);
  await page.keyboard.press('e');
  await page.locator('#dialogue').waitFor({ state: 'visible' });
  await playScene(1);

  await walk('前往听声台', 'a');
  await playScene(2);
  await walk('操作发声塔', 'd');
  await playScene(1);
  await walk('和奶龙说话');
  await playScene();
  await page.getByRole('heading', { name: '灯谷合唱' }).waitFor();
  await page.getByText('已完成五章').waitFor();

  await page.getByRole('button', { name: '主菜单' }).click();
  await page.getByRole('button', { name: /继续游戏.*已通关/ }).click();
  await page.getByRole('heading', { name: '灯谷合唱' }).waitFor();
  assert.deepEqual(failures, []);
  console.log('Browser journey passed, including save and reload, puzzle retry, and a completed ending.');
} finally {
  await browser.close();
}
