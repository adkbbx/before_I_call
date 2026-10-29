import sharp from 'sharp';
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const rawDir = path.join(root, 'assets-src/raw');
const outDir = path.join(root, 'public/assets');
// Bound memory on machines running other agents.
sharp.cache(false);
sharp.concurrency(1);
const definitions = [
  ['room', 2560, 1440, false, 350000, 1280],
  ['lantern', 1024, 1536, true, 160000],
  ['aoandon-yokai', 1024, 1536, true, 260000],
  ...['mujina', 'chawan', 'yukionna', 'rokurokubi', 'hoichi'].map(n =>
    ['tale-' + n, 1536, 1024, false, 220000, 768]),
  ['washi-tile', 1024, 1024, false],
  ['hanko-frame', 256, 256, true],
  ['shoji-silhouette', 1024, 1536, true],
  ['og-base', 2048, 864, false],
];
async function optionalJson(file) {
  try { return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')); }
  catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}

// Blend opposite mirrored edge strips, tapering to zero at 96px.
// Matching border pixels avoid a seam without mirroring the whole texture.
async function seamlessPaper(input) {
  const { data, info } = await sharp(input).resize(1024, 1024).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const band = 96;
  for (let y = 0; y < h; y++) for (let d = 0; d < band; d++) {
    const t = 0.5 * (1 - d / (band - 1)) ** 2;
    for (let k = 0; k < c; k++) {
      const a = (y * w + d) * c + k, b = (y * w + w - 1 - d) * c + k;
      const av = data[a], bv = data[b];
      data[a] = Math.round(av * (1 - t) + bv * t);
      data[b] = Math.round(bv * (1 - t) + av * t);
    }
  }
  for (let x = 0; x < w; x++) for (let d = 0; d < band; d++) {
    const t = 0.5 * (1 - d / (band - 1)) ** 2;
    for (let k = 0; k < c; k++) {
      const a = (d * w + x) * c + k, b = ((h - 1 - d) * w + x) * c + k;
      const av = data[a], bv = data[b];
      data[a] = Math.round(av * (1 - t) + bv * t);
      data[b] = Math.round(bv * (1 - t) + av * t);
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function paperChecks() {
  // Test the decoded delivery file, including compression artifacts.
  const tile = await sharp(path.join(outDir, 'washi-tile.webp')).png().toBuffer();
  await sharp({ create: { width: 2048, height: 2048, channels: 3, background: '#efe6d2' } })
    .composite([0, 1024].flatMap(top => [0, 1024].map(left => ({ input: tile, left, top }))))
    .png().toFile(path.join(root, 'assets-src/washi-tile-check.png'));
  const pieces = [];
  for (const top of [0, 512]) for (const left of [0, 512]) {
    pieces.push({ input: await sharp(tile).extract({ left, top, width: 512, height: 512 }).png().toBuffer(),
      left: (left + 512) % 1024, top: (top + 512) % 1024 });
  }
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#efe6d2' } })
    .composite(pieces).png().toFile(path.join(root, 'assets-src/washi-tile-offset-check.png'));
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const workOrder = await readFile(path.join(root, 'ASSETS.md'), 'utf8');
  const bible = workOrder.match(/## Style bible[^\n]*\r?\n\r?\n> ([^\r\n]+)/)?.[1];
  const sections = workOrder.split(/### \d+\. /).slice(1);
  if (!bible || sections.length !== 12) throw new Error('Cannot parse ASSETS.md prompts');
  const choices = await optionalJson(path.join(root, 'assets-src/choices.json'));
  const rawFiles = await readdir(rawDir);
  const selected = [];
  for (const [name, width, height, alpha, budget, small] of definitions) {
    const candidates = rawFiles.filter(f => new RegExp('^' + name + '-(\\d+)\\.png$').test(f));
    candidates.sort((a, b) => Number(b.match(/-(\d+)\.png$/)[1]) - Number(a.match(/-(\d+)\.png$/)[1]));
    const choice = choices[name];
    const file = typeof choice === 'number' ? name + '-' + choice + '.png' : choice ?? candidates[0];
    if (!file || !candidates.includes(file)) throw new Error('Missing or invalid raw choice: ' + name);
    selected.push({ name, width, height, alpha, budget, small, file });
  }
  const manifest = [], report = [];
  for (const [i, asset] of selected.entries()) {
    const { name, width, height, alpha, budget, small, file } = asset;
    const rawPath = path.join(rawDir, file);
    const meta = await sharp(rawPath).metadata();
    if (alpha && (!meta.hasAlpha || (await sharp(rawPath).stats()).isOpaque))
      throw new Error(name + ': source has no effective transparency');
    const body = sections[i].match(/\n> ([^\r\n]+)/)?.[1];
    if (!body) throw new Error('Missing prompt for ' + name);
    const alt = sections[i].match(/Alt: "([^"]*)"/)?.[1] ?? '';
    const sidecar = await optionalJson(rawPath.replace(/\.png$/, '.json'));
    const prompt = sidecar.prompt ?? ([8, 9, 10].includes(i) ? '' : bible + '\n\n') + body +
      '\nOutput size ' + (name === 'hanko-frame' ? 1024 : width) + '×' + (name === 'hanko-frame' ? 1024 : height) + '.';
    const source = name === 'washi-tile' ? await seamlessPaper(rawPath) : rawPath;
    for (const targetWidth of small ? [width, small] : [width]) {
      const targetHeight = Math.round(height * targetWidth / width);
      const png = name === 'hanko-frame';
      const output = name + (targetWidth === width ? '' : '-' + targetWidth) + (png ? '.png' : '.webp');
      let quality = alpha ? 85 : 80;
      let encoded;
      do {
        let pipeline = sharp(source).resize(targetWidth, targetHeight, { fit: 'fill' });
        if (!alpha) pipeline = pipeline.removeAlpha();
        encoded = await (png ? pipeline.png({ compressionLevel: 9 }) : pipeline.webp({ quality, alphaQuality: 100 })).toBuffer();
        if (!budget || encoded.length <= budget || png) break;
        quality -= 5;
      } while (quality >= 5);
      if (budget && encoded.length > budget) throw new Error(output + ': over budget');
      await writeFile(path.join(outDir, output), encoded);
      const actual = await sharp(path.join(outDir, output)).metadata();
      if (actual.width !== targetWidth || actual.height !== targetHeight || Boolean(actual.hasAlpha) !== alpha)
        throw new Error(output + ': dimensions or alpha mismatch');
      manifest.push({ name, file: output, width: actual.width, height: actual.height,
        alpha: Boolean(actual.hasAlpha), blend: 'normal', alt, prompt });
      report.push({ file: output, bytes: (await stat(path.join(outDir, output))).size, quality: png ? null : quality,
        source: file, sourceWidth: meta.width, sourceHeight: meta.height });
    }
  }
  const tiles = [], cellW = 384, cellH = 310, columns = 3;
  for (const [i, entry] of manifest.entries()) {
    const left = (i % columns) * cellW, top = Math.floor(i / columns) * cellH;
    const thumb = await sharp(path.join(outDir, entry.file)).resize(360, 266, { fit: 'contain', background: '#0a0c12' })
      .flatten({ background: '#0a0c12' }).png().toBuffer();
    tiles.push({ input: thumb, left: left + 12, top: top + 8 });
    const label = Buffer.from('<svg width="384" height="30"><text x="12" y="21" font-size="16" font-family="sans-serif" fill="#efe6d2">' + entry.file + '</text></svg>');
    tiles.push({ input: label, left, top: top + 276 });
  }
  await sharp({ create: { width: columns * cellW, height: Math.ceil(manifest.length / columns) * cellH,
    channels: 3, background: '#0a0c12' } }).composite(tiles).png().toFile(path.join(outDir, 'contact-sheet.png'));
  await paperChecks();
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(root, 'assets-src/processing-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.table(report);
  console.log('Verified ' + manifest.length + ' outputs from ' + selected.length + ' assets. Dimensions, alpha and byte budgets pass.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
