// JLPT vocabulary from jamsinclair/open-anki-jlpt-decks (MIT), derived from Jonathan Waller's lists.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, jlptSources } from './config.mjs';

export function normalize(text) {
  return text.replace(/[（(［\[].*?[）)］\]]/g, '').replace(/[〜～]/g, '').split(/[・、;/]/).map(s => s.trim()).filter(Boolean);
}
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) rows.push([...row, field.replace(/\r$/, '')]);
  return rows;
}
export function vocabFromRows(byLevel) {
  const index = new Map();
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) for (const entry of byLevel[level] ?? []) {
    for (const key of [...normalize(entry.expression), ...normalize(entry.reading)]) if (!index.has(key)) index.set(key, { ...entry, level });
  }
  return { byLevel, lookup: word => index.get(word), cumulative(level) {
    const result = new Set();
    for (const l of ['N5', 'N4', 'N3', 'N2', 'N1']) { for (const e of byLevel[l] ?? []) for (const key of [...normalize(e.expression), ...normalize(e.reading)]) result.add(key); if (l === level) break; }
    return result;
  } };
}
export function loadVocab(directory = paths.jlpt) {
  const byLevel = {};
  for (const level of Object.keys(jlptSources)) {
    const rows = parseCsv(readFileSync(join(directory, `${level.toLowerCase()}.csv`), 'utf8'));
    byLevel[level] = rows.filter(r => r.length >= 3 && r[0] !== 'expression').map(([expression, reading, meaning]) => ({ expression, reading, meaning }));
  }
  return vocabFromRows(byLevel);
}
export async function downloadVocab() {
  mkdirSync(paths.jlpt, { recursive: true });
  for (const [level, url] of Object.entries(jlptSources)) {
    const response = await fetch(url); if (!response.ok) throw new Error(`JLPT ${level}: HTTP ${response.status}`);
    writeFileSync(join(paths.jlpt, `${level.toLowerCase()}.csv`), await response.text()); console.log(`${level}: downloaded`);
  }
}
if (process.argv[1]?.endsWith('jlpt.mjs')) downloadVocab().catch(e => { console.error(e.message); process.exitCode = 1; });
