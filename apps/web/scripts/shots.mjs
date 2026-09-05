/**
 * Visual check harness.
 *
 * Drives a real browser through the report, parking the scroll at a
 * chosen point inside each record and capturing the frame. Used during
 * development to confirm the pinned stages compose correctly — the whole
 * site is scroll-driven, so a static render of the document tells you
 * almost nothing.
 *
 * Usage: node scripts/shots.mjs [baseUrl] [--mobile]
 */

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', '.shots');
const base = process.argv[2]?.startsWith('http')
  ? process.argv[2]
  : 'http://localhost:5174';
const mobile = process.argv.includes('--mobile');

const EXECUTABLE = [
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));

if (!EXECUTABLE) {
  console.error('No Chromium found.');
  process.exit(1);
}

// Where inside each record to park, 0..1 of that record's own scroll.
const SHOTS = [
  ['00-coldopen', 'rec-00', 0.12],
  ['01-station', 'rec-01', 0.55],
  ['02-field', 'rec-02', 0.55],
  ['03-transit', 'rec-03', 0.5],
  ['04-trace', 'rec-04', 0.75],
  ['05-lock', 'rec-05', 0.55],
  ['06-lost-peak', 'rec-06', 0.35],
  ['06-lost-empty', 'rec-06', 0.95],
  ['07-archive', 'rec-07', 0.55],
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--enable-gpu', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(base, { waitUntil: 'networkidle' });
// Let the boot sequence finish and fonts settle.
await page.waitForTimeout(2600);

const suffix = mobile ? '-mobile' : '';

for (const [name, recId, within] of SHOTS) {
  await page.evaluate(
    ([id, frac]) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`missing section ${id}`);
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // A record's pinned stage spans (height - viewport) of scroll.
      const span = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + span * frac, behavior: 'instant' });
    },
    [recId, within],
  );
  // Several frames for the eased shader uniforms and canvas layers.
  await page.waitForTimeout(4200);
  await page.screenshot({ path: path.join(outDir, `${name}${suffix}.png`) });
  process.stdout.write(`· ${name}${suffix}\n`);
}

await browser.close();

if (errors.length) {
  console.log('\nconsole errors:');
  for (const e of [...new Set(errors)].slice(0, 20)) console.log('  ' + e);
} else {
  console.log('\nno console errors');
}
console.log(`shots -> ${outDir}`);
