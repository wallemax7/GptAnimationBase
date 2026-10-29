import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find(p => p && existsSync(p));
assert(chrome, 'Set CHROME_PATH to an installed Chrome or Chromium executable');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 120000,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', ...(process.platform === 'linux' ? ['--no-sandbox'] : [])] });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?render', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  mkdirSync('out/check', { recursive: true });
  const save = (name, url) => writeFileSync(`out/check/${name}.jpg`, Buffer.from(url.split(',')[1], 'base64'));

  const demo = await page.evaluate(async () => {
    for (const t of [0, .25, 1.05, 1.9, 4.4, 5.8, 6.65, 7.1, 7.9, 9.8, 10.7, 10.95]) {
      const image = await window.renderAt(t);
      if (image.length < 10000) throw new Error(`Empty frame at ${t}`);
    }
    const first = await window.renderAt(7.45);
    await window.renderAt(2.4);
    const repeated = await window.renderAt(7.45), moved = await window.renderAt(7.6);
    const sheet = await window.renderSheet([1.5, 2, 5.4, 6.3, 7.45, 9.5], 3, 640);
    return { deterministic: first === repeated, moving: first !== moved, sheet: sheet.url };
  });
  assert(demo.deterministic, 'Seeking out of order must preserve the same frame');
  assert(demo.moving, 'The returning star must move with time');
  save('demo', demo.sheet);
  console.log('PASS demo key times and deterministic seeking');

  const transition = await page.evaluate(() => window.renderSheet([4.15, 4.25, 4.39, 4.4, 4.55, 4.7], 3, 480));
  save('transition', transition.url);
  const effects = await page.evaluate(async () => {
    window.LOOP = LOOPS.effects;
    const before = await window.renderAt(.25), after = await window.renderAt(1);
    await window.renderAt(2.5);
    return { moving: before !== after, sheet: (await window.renderSheet([1], 1, 1920)).url };
  });
  assert(effects.moving, 'Standalone effects must animate');
  save('effects', effects.sheet);
  console.log('PASS transition and standalone effects');

  const fallback = await page.evaluate(async () => {
    window.LOOP = null;
    const shots = SHOTS.splice(0);
    try { return (await window.renderAt(1)).length; }
    finally { SHOTS.push(...shots); }
  });
  assert(fallback > 10000, 'An empty timeline must still render');
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?t=5', { waitUntil: 'networkidle0' });
  await page.waitForFunction('document.getElementById("tt").textContent.startsWith("5.00s")');
  await page.$eval('#scrub', s => { s.value = '7'; s.dispatchEvent(new Event('input')); });
  await page.waitForFunction('Math.abs(parseFloat(document.getElementById("tt").textContent) - 7) < .03');
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?loop=effects&t=1', { waitUntil: 'networkidle0' });
  await page.waitForFunction('document.getElementById("tt").textContent.startsWith("1.00s")');
  assert.equal(await page.$eval('#scrub', s => Number(s.max)), 4);
  assert.deepEqual(errors, [], 'No browser script errors');
  console.log('PASS empty timeline, interactive seeking and effect loop URL; no browser script errors');
} finally {
  await browser.close();
}
