// Real pipeline data only. No fixture injection or API substitution.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:4173';
const output = 'docs/screenshots';
await mkdir(output, { recursive: true });
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--configLoader', 'runner', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'pipe', windowsHide: true });
let previewLog = ''; preview.stderr.on('data', b => { previewLog += b; });
const index = JSON.parse(await readFile('public/tales/index.json', 'utf8'));
const preferred = index.tales.find(t => t.id === 'mujina') ?? index.tales[0];
const tale = preferred ? JSON.parse(await readFile(`public/tales/${preferred.id}.json`, 'utf8')) : null;
const level = tale ? ['N4', 'N5', 'N3'].find(l => tale.scenes.every(s => s.retellings[l])) : null;
const screenshots = [], skips = [], checks = [], errors = [];
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch {} if (preview.exitCode !== null) throw new Error(previewLog); await new Promise(r => setTimeout(r, 100)); }
  const possible = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const executablePath = possible.find(p => existsSync(p));
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  async function context(width, reduced = false) { const c = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : width === 360 ? 740 : 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); return { c, p }; }
  async function ready(p) { await p.waitForFunction(() => !document.body.textContent.includes('The tales are being brought')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500); }
  async function shot(p, name, width) { await ready(p); const filename = `${name}-${width}.png`; await p.screenshot({ path: `${output}/${filename}`, fullPage: name === 'about' }); screenshots.push(filename); }
  async function noOverflow(p, name) { const sizes = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth })); assert.ok(sizes.scroll <= sizes.width, `${name} overflows: ${JSON.stringify(sizes)}`); checks.push(`${name}: no horizontal page scroll`); }
  async function reader(p, demo = false) { await p.goto(`${base}/${demo ? '?night=demo' : ''}#/tale/${tale.id}`); await ready(p); const select = p.getByLabel('Reading level', { exact: true }); if (await select.count()) { await select.selectOption(level); } else { await p.getByRole('button', { name: `Read at ${level}` }).click(); } await p.waitForSelector('.question'); }
  async function answer(p, wrong = false) { const r = tale.scenes[0].retellings[level], i = wrong ? (r.question.answer + 1) % 3 : r.question.answer; await p.locator('.answer').nth(i).click(); }
  async function hold(p, number = 1) { const b = p.getByRole('button', { name: `Blow out the candle for scene ${number}`, exact: true }); await b.focus(); await p.keyboard.down('Space'); await p.waitForTimeout(850); await p.keyboard.up('Space'); }
  for (const width of [390, 1440]) {
    const { c, p } = await context(width);
    await p.goto(base); await shot(p, 'room', width);
    await p.goto(`${base}/#/shelf`); await shot(p, 'shelf', width);
    await p.goto(`${base}/#/about`); await shot(p, 'about', width);
    await p.getByRole('button', { name: /^Words that followed you:/ }).click(); await shot(p, 'export', width); await p.keyboard.press('Escape');
    if (tale && level) {
      await reader(p); await shot(p, width === 1440 ? 'reader-vertical' : 'reader-horizontal', width);
      const storyWord = p.locator('.story .word-story'); await (await storyWord.count() ? storyWord.first() : p.locator('.story .word').first()).click(); await shot(p, 'reader-gloss', width); await p.keyboard.press('Escape');
      await p.getByRole('button', { name: '原文 Original', exact: true }).click(); await shot(p, 'original', width); await p.keyboard.press('Escape');
      await answer(p, true); await p.locator('.question-result').scrollIntoViewIfNeeded(); await shot(p, 'wrong-answer', width);
      await reader(p, true); await answer(p); await hold(p); await p.waitForSelector('.reveal'); await p.waitForTimeout(6400); await shot(p, 'reveal', width);
    } else skips.push(`${width}: Reader, gloss, original, wrong answer and Reveal require a real tale with a complete level`);
    await c.close();
    const reduced = await context(width, true); await reduced.p.goto(base); await shot(reduced.p, 'room-reduced', width);
    assert.equal(await reduced.p.locator('.smoke').count(), 0); assert.equal(await reduced.p.locator('.lantern-glow').evaluate(el => getComputedStyle(el).animationName), 'none');
    const canvasBefore = await reduced.p.locator('.candle-field canvas').evaluate(c => c.toDataURL());
    await reduced.p.waitForTimeout(150);
    assert.equal(await reduced.p.locator('.candle-field canvas').evaluate(c => c.toDataURL()), canvasBefore);
    assert.equal(await reduced.p.locator('.room-background').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    checks.push(`${width}: reduced Room has no smoke or lantern flicker`);
    await reduced.c.close();
  }
  const small = await context(360);
  for (const [name, hash] of [['Room', '#/'], ['Shelf', '#/shelf'], ['About', '#/about']]) { await small.p.goto(`${base}/${hash}`); await ready(small.p); await noOverflow(small.p, name); }
  await small.p.getByRole('button', { name: /^Words that followed you:/ }).click(); await noOverflow(small.p, 'Export'); await small.p.keyboard.press('Escape');
  if (tale && level) {
    await reader(small.p); await noOverflow(small.p, 'Reader'); await small.p.locator('.story .word').first().click(); await noOverflow(small.p, 'Gloss'); await small.p.keyboard.press('Escape');
    await small.p.getByRole('button', { name: '原文 Original', exact: true }).click(); await noOverflow(small.p, 'Original'); await small.p.keyboard.press('Escape');
    await answer(small.p, true); await noOverflow(small.p, 'Wrong answer');
    await reader(small.p, true); await answer(small.p); await hold(small.p); await small.p.waitForSelector('.reveal'); await noOverflow(small.p, 'Reveal');
  }
  await small.c.close();
  if (tale && level) {
    const complete = await context(360, true); await reader(complete.p);
    for (let i = 0; i < tale.scenes.length; i++) {
      await complete.p.locator('.answer').nth(tale.scenes[i].retellings[level].question.answer).click();
      await hold(complete.p, i + 1); await complete.p.waitForSelector('.next-scene');
      assert.ok(await complete.p.locator('.next-scene').evaluate(el => document.activeElement === el), 'Next scene receives focus after extinguish');
      await complete.p.keyboard.press('Enter');
      if (i + 1 < tale.scenes.length) { await complete.p.waitForSelector(`[aria-label="Scene ${i + 2}"]`); assert.equal(await complete.p.locator('.reading-flow').evaluate(el => el.scrollTop), 0); }
    }
    await complete.p.waitForSelector('.tale-summary'); await noOverflow(complete.p, 'Tale summary'); checks.push('All scenes: hold, next-scene focus, reading-position reset and end-of-tale summary'); await complete.c.close();
  }
  // This route remains verifiable even before content generation completes.
  {
    const { c, p } = await context(390, true); await p.goto(`${base}/?night=demo#/`); await ready(p);
    async function reach(selector) { for (let n = 0; n < 100; n++) { if (await p.locator(selector).evaluateAll(els => els.includes(document.activeElement))) return; await p.keyboard.press('Tab'); } throw new Error(`Keyboard cannot reach ${selector}`); }
    await reach('[role="radio"][aria-checked="true"]'); const before = await p.locator('[role="radio"][aria-checked="true"]').textContent(); await p.keyboard.press('ArrowRight'); assert.notEqual(await p.locator('[role="radio"][aria-checked="true"]').textContent(), before);
    await reach('.room-demo'); await p.keyboard.press('Enter'); await p.waitForURL(url => url.hash === '#/shelf'); await ready(p);
    await reach('.topbar-ghost'); await p.keyboard.press('Enter'); await p.waitForSelector('[role="dialog"]'); await p.keyboard.press('Shift+Tab'); assert.ok(await p.locator('[role="dialog"]').evaluate(el => el.contains(document.activeElement))); await p.keyboard.press('Escape'); assert.ok(await p.locator('.topbar-ghost').evaluate(el => el === document.activeElement));
    checks.push('Keyboard: Room → level radio arrow → Demo link → Shelf → Export focus trap → Escape restores focus');
    await c.close();
  }
  // Keyboard only journey, including Room radio arrows and the demo link.
  if (tale && level) {
    const { c, p } = await context(1440, true); await p.goto(`${base}/?night=demo#/`); await ready(p);
    async function tabTo(selector) { for (let n = 0; n < 600; n++) { if (await p.locator(selector).evaluateAll(els => els.includes(document.activeElement))) return; await p.keyboard.press('Tab'); } throw new Error(`Cannot reach ${selector} by keyboard`); }
    await tabTo('[role="radio"][aria-checked="true"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowLeft');
    await tabTo('.room-demo'); await p.keyboard.press('Enter'); await p.waitForSelector('.scroll-card');
    await tabTo(`.scroll-card[href="#/tale/${tale.id}"]`); await p.keyboard.press('Enter'); await ready(p);
    if (await p.getByRole('button', { name: `Read at ${level}` }).count()) { await tabTo('.empty button'); await p.keyboard.press('Enter'); }
    await p.waitForSelector('.question');
    // Choose the answer from the selected real retelling, with Tab and Enter only.
    const selected = await p.getByLabel('Reading level', { exact: true }).inputValue();
    const correct = tale.scenes[0].retellings[selected].question.answer;
    await tabTo(`.answer:nth-child(${correct + 1})`); await p.keyboard.press('Enter');
    await tabTo('.blow-button'); await p.keyboard.down('Space'); await p.waitForTimeout(850); await p.keyboard.up('Space'); await p.waitForSelector('.reveal'); await p.waitForTimeout(500);
    assert.equal(await p.locator('.smoke').count(), 0); assert.equal(await p.locator('.room-background').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    checks.push('Keyboard: Room radio arrows → Demo link → Shelf tale → answer → hold Space 800 ms → Reveal; reduced motion has no smoke and instant dim'); await c.close();
  } else skips.push('Keyboard Room-to-Reveal and reduced Reader extinguish verification require a real tale');
  assert.deepEqual(errors, [], 'Browser errors');
} finally {
  await browser?.close(); preview.kill();
  await writeFile(`${output}/verification.json`, JSON.stringify({ screenshots, checks, skips, errors, tale: tale?.id ?? null }, null, 2));
}
console.log(JSON.stringify({ screenshots, checks, skips }, null, 2));
