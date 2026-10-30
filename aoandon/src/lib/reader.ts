import { plural } from './plural.ts';
import { levels, type Token, type Tale, type Level, type TaleIndex, type Sentence } from './schema.ts';
import type { FuriganaMode, WritingMode } from './prefs.ts';
import { sceneKey, type NightState } from './night.ts';
export const sentenceText = (s: Sentence) => s.tokens.map(t => t.s).join('');
export function showFurigana(token: Token, mode: FuriganaMode): boolean {
  return !!token.r && (token.k === 'story' || (mode === 'all' && (token.k !== 'plain' || !!token.hk)) || (mode === 'above-level' && !!token.hk));
}
export function availableLevels(tale: Tale): Level[] { return levels.filter(l => tale.scenes.every(s => !!s.retellings[l])); }
export function nextScene(tale: Tale, index: number): number | null { return index + 1 < tale.scenes.length ? index + 1 : null; }
export function sceneFinished(night: NightState, tale: Tale, index: number): boolean { return night.done.includes(sceneKey(tale.id, tale.scenes[index].id, night.level)); }
export function firstUnread(tale: Tale, night: NightState): number { const i = tale.scenes.findIndex(s => !night.done.includes(sceneKey(tale.id, s.id, night.level))); return i < 0 ? 0 : i; }
type Rect = { left: number; top: number; width: number; height: number };
export function placeGloss(anchor: Rect, slip: { width: number; height: number }, viewport: { width: number; height: number }, mode: WritingMode) {
  const width = Math.max(0, Math.min(slip.width, viewport.width - 16));
  const height = Math.max(0, Math.min(slip.height, viewport.height - 16));
  let left = mode === 'vertical' ? anchor.left - width - 10 : anchor.left;
  let top = mode === 'vertical' ? anchor.top : anchor.top + anchor.height + 10;
  if (mode === 'vertical' && left < 8) left = anchor.left + anchor.width + 10;
  if (mode === 'horizontal' && top + height > viewport.height - 8) top = anchor.top - height - 10;
  return { left: Math.max(8, Math.min(left, viewport.width - width - 8)), top: Math.max(8, Math.min(top, viewport.height - height - 8)), width, maxHeight: height };
}
export function coverageLine(tale: TaleIndex['tales'][number], level: Level): string {
  const coverage = tale.coverage[level];
  return coverage === undefined ? `${level} is not available · Available: ${levels.filter(l => tale.coverage[l] !== undefined).join(', ') || 'none yet'}` : `${plural(tale.scenes, 'scene')} · ${Math.round(coverage * 100)}% ${level} words`;
}
export function aggregateMetrics(tales: Tale[]) {
  const groups = new Map<string, { level: Level; model: string; count: number; first: number; final: number; ghosts: number; kanji: number; density: number; kanjiCount: number }>();
  for (const tale of tales) for (const scene of tale.scenes) for (const level of levels) {
    const r = scene.retellings[level]; if (!r) continue;
    const key = `${level}/${r.model}`;
    const row = groups.get(key) ?? { level, model: r.model, count: 0, first: 0, final: 0, ghosts: 0, kanji: 0, density: 0, kanjiCount: 0 };
    if (r.metrics.kanjiCoverage !== undefined) { row.kanji += r.metrics.kanjiCoverage; row.density += r.metrics.kanjiDensity ?? 0; row.kanjiCount++; }
    row.count++; row.first += r.metrics.firstCoverage; row.final += r.metrics.finalCoverage; row.ghosts += r.metrics.ghostWords.length; groups.set(key, row);
  }
  return [...groups.values()].map(r => ({ ...r, first: r.first / r.count, final: r.final / r.count, ghosts: r.ghosts / r.count, kanji: r.kanjiCount ? r.kanji / r.kanjiCount : undefined, density: r.kanjiCount ? r.density / r.kanjiCount : undefined }));
}
