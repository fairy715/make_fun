// Takes the game's screenshots: opens game/index.html in headless Chromium at each scene of
// shots.json (?shot=...), waits for the frame, and saves it as a JPEG under screenshots/ at the
// game's own 1280 x 720. Any page error fails the run.
//   node tools/shoot.mjs [out dir, default screenshots]
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = resolve(root, process.argv[2] || 'screenshots');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const page_url = pathToFileURL(join(root, 'game', 'index.html')).href;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
for (const shot of shots) {
  await page.goto(page_url + shot.query);
  await page.waitForFunction(() => window.LK_SHOT_READY === true, null, { timeout: 60000 });
  const file = join(outDir, shot.name);
  await page.locator('#game').screenshot({ path: file, type: 'jpeg', quality: shot.quality || 86 });
  console.log(`${shot.name}  ${statSync(file).size} bytes`);
}
await browser.close();
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}
