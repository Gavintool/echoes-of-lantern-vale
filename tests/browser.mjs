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
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByLabel('Dialogue speed').selectOption('instant');
  await page.getByLabel('3D quality').selectOption('low');
  await page.getByLabel('Ambient motion').uncheck();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /Begin Journey/ }).click();
  await page.getByRole('button', { name: /01 Empty slot/ }).click();
  await page.getByLabel('Journey name').fill('Harbor');
  await page.getByRole('button', { name: 'Begin journey', exact: true }).click();

  await walk('Talk to 奶龙');
  await page.getByRole('button', { name: 'History' }).click();
  await page.locator('#history').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await playScene();

  await walk('Talk to Yun', 'a');
  await playScene();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Save now/ }).click();
  await page.reload();
  await page.getByRole('button', { name: /Continue.*Harbor/ }).click();
  await page.keyboard.press('j');
  await page.getByText('The governor', { exact: true }).waitFor();
  await page.keyboard.press('Escape');

  await walk('Talk to Ren', 'd', 1300);
  await playScene();
  await walk('Listen to Wax cylinder', 'a');
  await playScene();

  await page.keyboard.press('j');
  await page.getByText('Low river hum → two breaths → high bell.').waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  await walk('Tune Lantern organ', 'd', 1300);
  await playScene(2);
  await page.keyboard.press('e');
  await page.locator('#dialogue').waitFor({ state: 'visible' });
  await playScene(1);

  await walk('Approach Listening platform', 'a');
  await playScene(2);
  await walk('Operate Vale transmitter', 'd');
  await playScene(1);
  await walk('Talk to 奶龙');
  await playScene();
  await page.getByRole('heading', { name: 'The living chorus' }).waitFor();
  await page.getByText('5 chapters completed').waitFor();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('button', { name: /Continue.*Ending complete/ }).click();
  await page.getByRole('heading', { name: 'The living chorus' }).waitFor();
  assert.deepEqual(failures, []);
  console.log('Browser journey passed, including save and reload, puzzle retry, and a completed ending.');
} finally {
  await browser.close();
}
