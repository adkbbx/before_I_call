// Aozora Shift_JIS zip ingestion; exported pure parsers preserve source ruby and paragraphs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import { paths, tales } from './config.mjs';
export function parseRubyLine(line, warnings = []) {
  line = line.replace(/※［＃([^］]*)］/g, (_, note) => {
    const code = note.match(/U\+([\dA-Fa-f]{4,6})/);
    if (code) { const n = parseInt(code[1], 16); if (n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) return String.fromCodePoint(n); }
    warnings.push(`Unresolved gaiji: ${note}`); return '〓';
  }).replace(/［＃[^］]*］/g, '');
  const result = [], pattern = /｜([^《\n]+)《([^》]+)》|([一-龯々〆ヵヶ]+)《([^》]+)》/gu;
  let end = 0;
  for (const m of line.matchAll(pattern)) {
    if (m.index > end) result.push({ base: line.slice(end, m.index) });
    result.push({ base: m[1] ?? m[3], rt: m[2] ?? m[4] }); end = m.index + m[0].length;
  }
  if (end < line.length) result.push({ base: line.slice(end) });
  return result;
}
export function stripHeaderAndColophon(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const block = /^-{3,}[^\n]*\n[\s\S]*?【テキスト中に現れる記号について】[\s\S]*?^-{3,}[^\n]*(?:\n|$)/m.exec(text);
  if (block) text = text.slice(block.index + block[0].length);
  const index = text.indexOf('底本：');
  return { text: (index < 0 ? text : text.slice(0, index)).trim(), colophon: index < 0 ? '' : text.slice(index).trim() };
}
const size = paragraphs => paragraphs.reduce((n,p) => n + p.reduce((m,r) => m + [...r.base].length, 0), 0);
export function splitScenes(paragraphs, min = 250, max = 500) {
  // Dynamic partition avoids a short final scene whenever paragraph boundaries permit the bounds.
  const best = new Map([[paragraphs.length, { cost: 0, groups: [] }]]);
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    let chosen;
    for (let j = i + 1; j <= paragraphs.length; j++) {
      const group = paragraphs.slice(i,j), length = size(group), tail = best.get(j);
      const cost = Math.max(0,min-length) ** 2 + Math.max(0,length-max) ** 2 + tail.cost + 1;
      if (!chosen || cost < chosen.cost) chosen = { cost, groups: [group, ...tail.groups] };
      if (length > max) break;
    }
    best.set(i, chosen);
  }
  return best.get(0).groups.map((original,i) => ({ id: `s${String(i+1).padStart(2,'0')}`, original }));
}
export function parseAozora(raw, id) {
  const { text, colophon } = stripHeaderAndColophon(raw), warnings = [];
  const paragraphs = text.split('\n').map(l => parseRubyLine(l.trim(), warnings)).filter(p => p.length);
  const scenes = splitScenes(paragraphs);
  for (const s of scenes) { const n = size(s.original); if (n < 250 || n > 500) warnings.push(`${s.id}: ${n} characters; paragraph boundaries prevent 250..500 bounds`); }
  return { id, colophon, paragraphs, scenes, warnings };
}
export async function fetchTale(tale) {
  const card = await fetch(tale.aozoraCard); if (!card.ok) throw new Error(`Card HTTP ${card.status}`);
  const html = await card.text(), link = html.match(/href=["'](\.\/files\/[^"']+\.zip)["']/i)?.[1];
  if (!link) throw new Error(`No text zip for ${tale.id}`);
  const response = await fetch(new URL(link,tale.aozoraCard)); if (!response.ok) throw new Error(`Zip HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer()); mkdirSync(paths.source, { recursive: true });
  writeFileSync(join(paths.source,`${tale.id}.zip`), bytes);
  const entry = new AdmZip(bytes).getEntries().find(e => /\.txt$/i.test(e.entryName)); if (!entry) throw new Error('No text in zip');
  const source = parseAozora(iconv.decode(entry.getData(),'Shift_JIS'),tale.id);
  writeFileSync(join(paths.source,`${tale.id}.json`), JSON.stringify(source,null,2)+'\n');
  console.log(`${tale.id}: ${source.scenes.length} scenes; warnings: ${source.warnings.length ? source.warnings.join('; ') : 'none'}`);
  return source;
}
if (process.argv[1]?.endsWith('aozora.mjs')) {
  const selected = process.argv.includes('--tales') ? process.argv[process.argv.indexOf('--tales')+1].split(',') : ['all'];
  for (const tale of tales.filter(t => selected.includes('all') || selected.includes(t.id))) await fetchTale(tale).catch(e => { console.error(`${tale.id}: ${e.message}`); process.exitCode = 1; });
}
