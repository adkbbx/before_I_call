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
  async function context(width, reduced = false, { height, fresh = false } = {}) { const c = await browser.newContext({ viewport: { width, height: height ?? (width === 1440 ? 900 : width === 360 ? 740 : 844) }, reducedMotion: reduced ? 'reduce' : 'no-preference' }); if (!fresh) await c.addInitScript(() => { try { sessionStorage.setItem('aoandon-room-seen', '1'); } catch {} }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); return { c, p }; }
  async function ready(p) { await p.waitForFunction(() => !document.body.textContent.includes('The tales are being brought')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500); }
  async function shot(p, name, width) { await ready(p); const filename = `${name}-${width}.png`; await p.screenshot({ path: `${output}/${filename}`, fullPage: ['about', 'shelf'].includes(name) }); screenshots.push(filename); }
  async function noOverflow(p, name) { const sizes = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth })); assert.ok(sizes.scroll <= sizes.width, `${name} overflows: ${JSON.stringify(sizes)}`); checks.push(`${name}: no horizontal page scroll`); }
  async function reader(p, demo = false) { await p.goto(`${base}/${demo ? '?night=demo' : ''}#/tale/${tale.id}`); await ready(p); const group = p.getByRole('radiogroup', { name: 'Reading level', exact: true }); if (await group.count()) { await group.getByRole('radio', { name: level, exact: true }).click(); } else { await p.getByRole('button', { name: `Read at ${level}` }).click(); } await p.waitForSelector('.question'); }
  async function answer(p, wrong = false) { const r = tale.scenes[0].retellings[level], i = wrong ? (r.question.answer + 1) % 3 : r.question.answer; await p.locator('.answer').nth(i).click(); }
  async function hold(p, number = 1) { const b = p.getByRole('button', { name: `Blow out the candle for scene ${number}`, exact: true }); await b.focus(); await p.keyboard.down('Space'); await p.waitForTimeout(850); await p.keyboard.up('Space'); }

  async function checkSeals(p) {
    const results = await p.locator('.level-seal:not(.is-selected) .level-seal-mark').evaluateAll(elements => {
      const luminance = rgb => { const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; };
      const dark = luminance('rgb(10,12,18)');
      return elements.map(el => { const color = luminance(getComputedStyle(el).color); return { ratio: (color + .05) / (dark + .05), clip: getComputedStyle(el, '::after').clipPath }; });
    });
    for (const result of results) { assert.ok(result.ratio >= 3, 'Unselected seal contrast on night'); assert.notEqual(result.clip, 'none', 'Seal texture restricted to border'); }
  }
  async function checkRoomSpacing(p, { fold = true } = {}) {
    const info = await p.evaluate(() => { const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right }; }; return { intro:box('.room-line'), title:box('.room-title'), lantern:box('.room-spirit'), count:box('.candle-count'), begin:box('.room-actions .button-primary'), seals:[...document.querySelectorAll('.level-seal')].map(el => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right }; }), scroll:document.documentElement.scrollWidth, width:innerWidth, height:innerHeight }; });
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    assert.ok(!overlap(info.intro, info.lantern), `Intro clears lantern at ${info.width}x${info.height}`);
    assert.ok(!overlap(info.count, info.lantern), 'Candle count clears lantern');
    assert.ok(info.scroll <= info.width, `No horizontal page scroll at ${info.width}: ${info.scroll}`);
    for (let i = 1; i < info.seals.length; i++) assert.ok(!overlap(info.seals[i - 1], info.seals[i]), 'Seals do not collide');
    if (info.width >= 720) assert.equal(new Set(info.seals.map(s => Math.round(s.top))).size, 1, 'Five seals in one row');
    if (info.width < 720) assert.equal(new Set(info.seals.map(s => Math.round(s.top))).size, 2, 'Seals wrap 3 + 2');
    if (fold && info.width >= 720) { assert.ok(info.begin.bottom <= info.height, `Begin button above the fold at ${info.width}x${info.height}: ${info.begin.bottom}`); assert.ok(info.seals.every(s => s.bottom <= info.height) && info.lantern.bottom <= info.height && info.title.top >= 0); }
    checks.push(`Room ${info.width}x${info.height}: intro clear of lantern, one-row/wrapped seals, no horizontal scroll${fold && info.width >= 720 ? ', Begin above the fold' : ''}`);
  }  async function checkShelf(p, width) {
    await checkSeals(p); assert.equal(await p.locator('.scroll-card').count(), 5);
    const boxes = await p.locator('.scroll-card').evaluateAll(els => els.map(el => { const r=el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left }; }));
    if (width >= 1024) { assert.equal(new Set(boxes.map(b => b.top)).size, 1); assert.equal(new Set(boxes.map(b => b.bottom)).size, 5, 'Five distinct hanging-scroll lengths'); }
    else if (width <= 680) { for (let i=1;i<boxes.length;i++) assert.ok(boxes[i].top > boxes[i-1].bottom); }
    else { assert.equal(new Set(boxes.map(b => b.top)).size, 1); await p.locator('.scroll-card').last().scrollIntoViewIfNeeded(); assert.ok(await p.locator('.scrolls').evaluate(el => el.scrollLeft > 0)); await p.locator('.scroll-card').first().scrollIntoViewIfNeeded(); }
    checks.push(width + ': five tales, Shelf layout and seal contrast');
  }
  async function checkTabs(p, width) {
    assert.equal(await p.locator('.reader-controls select').count(), 0);
    for (const label of ['Writing', 'Furigana', 'Reading level']) {
      const group = p.getByRole('radiogroup', { name:label, exact:true });
      const active=group.locator('[aria-checked="true"]'); const before=await active.textContent();
      await active.focus(); await p.keyboard.press('ArrowRight');
      if (label !== 'Writing' || width > 680) { assert.notEqual(await group.locator('[aria-checked="true"]').textContent(), before); await p.keyboard.press('ArrowLeft'); await p.waitForFunction(({label,before}) => [...document.querySelectorAll('[role="radiogroup"]')].find(el => el.getAttribute('aria-label') === label)?.querySelector('[aria-checked="true"]')?.textContent === before, {label,before}); }
      for (const target of await group.getByRole('radio').all()) { const box=await target.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44); }
      assert.equal(await group.locator('[aria-checked="true"]').evaluate(el => getComputedStyle(el).borderBottomWidth), '2px');
    }
    if(width <= 680) assert.ok(await p.getByRole('radio', {name:'縦 Vertical',exact:true}).isDisabled());
    checks.push(width + ': paper tabs, arrow navigation, 44px targets and 2px active underline');
  }

  for (const width of [390, 1440]) {
    const { c, p } = await context(width);
    await p.goto(base); await shot(p, 'room', width); await checkSeals(p); await checkRoomSpacing(p);
    await p.goto(`${base}/#/shelf`); await shot(p, 'shelf', width); await checkShelf(p, width);
    await p.goto(`${base}/#/about`); await shot(p, 'about', width);
    await p.getByRole('button', { name: /^Words that followed you:/ }).click(); await shot(p, 'export', width); await p.keyboard.press('Escape');
    if (tale && level) {
      await reader(p); await checkTabs(p, width); await shot(p, width === 1440 ? 'reader-vertical' : 'reader-horizontal', width);
      const storyWord = p.locator('.story .word-story'); await (await storyWord.count() ? storyWord.first() : p.locator('.story .word').first()).click(); await shot(p, 'reader-gloss', width); await p.keyboard.press('Escape');
      await p.getByRole('button', { name: '原文 Original', exact: true }).click(); await shot(p, 'original', width); await p.keyboard.press('Escape');
      await answer(p, true); await p.locator('.question-result').scrollIntoViewIfNeeded(); await shot(p, 'wrong-answer', width);
      await reader(p, true); await answer(p); await hold(p); await p.waitForSelector('.reveal'); await p.waitForTimeout(6400); await shot(p, 'reveal', width); assert.equal(await p.locator('#reveal-title').evaluate(el => getComputedStyle(el).outlineStyle), 'none'); assert.match(await p.locator('.reveal-copy').textContent(), /1 tale \u00b7 1 scene/);
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
  for (const [width, height] of [[1280, 600], [1333, 594], [1366, 640], [1440, 900], [1920, 1080], [390, 844]]) {
    const { c, p } = await context(width, false, { height }); await p.goto(base); await ready(p); await p.waitForTimeout(1800);
    await checkRoomSpacing(p); const filename = `room-${width}x${height}.png`; await p.screenshot({ path: `${output}/${filename}` }); screenshots.push(filename); await c.close();
  }
  {
    // First view of a session: ink-bleed title and the candle wave, then drifting onibi.
    const { c, p } = await context(1440, false, { height: 900, fresh: true }); await p.goto(base); const t0 = Date.now();
    assert.ok(await p.locator('.room-ink').count(), 'First view bleeds in the title');
    await p.waitForTimeout(Math.max(0, 1000 - (Date.now() - t0))); await p.screenshot({ path: `${output}/room-motion-1s.png` }); screenshots.push('room-motion-1s.png');
    const wisps = () => p.locator('.onibi').evaluateAll(els => els.map(el => el.style.transform));
    const early = await wisps(); const lanternBefore = await p.locator('.room-spirit').getAttribute('style');
    await p.mouse.move(40, 40); await p.mouse.move(1400, 860, { steps: 8 });
    await p.waitForTimeout(Math.max(0, 6000 - (Date.now() - t0))); await p.screenshot({ path: `${output}/room-motion-6s.png` }); screenshots.push('room-motion-6s.png');
    assert.equal((await wisps()).length, 4); assert.notDeepEqual(await wisps(), early, 'Ambient onibi drift');
    const shift = await p.evaluate(() => ({ bg: getComputedStyle(document.querySelector('.room-background')).transform, lantern: getComputedStyle(document.querySelector('.room-spirit')).transform }));
    assert.notEqual(shift.bg, 'none', 'Parallax moves the background'); assert.notEqual(shift.lantern, 'none', 'Parallax moves the lantern');
    const maxShift = m => { const v = m.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number) ?? [0, 0, 0, 0, 0, 0]; return Math.max(Math.abs(v[4]), Math.abs(v[5])); };
    assert.ok(maxShift(shift.bg) <= 8.01 && maxShift(shift.lantern) <= 4.01, 'Parallax is clamped');
    assert.ok(Number(await p.locator('.lantern-glow').evaluate(el => getComputedStyle(el).opacity)) > 0, 'Lantern glow visible');
    await p.goto(`${base}/#/about`); await p.goto(`${base}/#/`); await p.waitForSelector('.room-title'); assert.equal(await p.locator('.room-ink').count(), 0, 'Title ink only on the first view of a session'); void lanternBefore;
    checks.push('Room motion: first-view ink title, drifting onibi, clamped parallax, no replay on return'); await c.close();
  }
  { const { c, p } = await context(1440, true, { height: 900, fresh: true }); await p.goto(base); await ready(p);
    assert.equal(await p.locator('.room-ink').count(), 0, 'Reduced motion: no ink bleed'); assert.equal(await p.locator('.onibi').first().evaluate(el => getComputedStyle(el).animationName), 'none'); assert.equal(await p.locator('.floor-mist i').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    const before = await p.locator('.onibi').evaluateAll(els => els.map(el => el.style.transform)); await p.waitForTimeout(600); assert.deepEqual(await p.locator('.onibi').evaluateAll(els => els.map(el => el.style.transform)), before, 'Reduced motion: onibi hold still');
    checks.push('Reduced Room: no ink, no wave, onibi and mist still'); await c.close(); }  { const { c, p } = await context(768); await p.goto(base + '/#/shelf'); await ready(p); await checkShelf(p, 768); await shot(p, 'shelf', 768); await c.close(); }
  for (const width of [360, 680, 681, 719, 720, 1024]) { const { c, p } = await context(width); await p.goto(base); await ready(p); await checkRoomSpacing(p, { fold: false }); await c.close(); }
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
    const selected = await p.getByRole('radiogroup', { name: 'Reading level', exact: true }).locator('[aria-checked="true"]').textContent();
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
