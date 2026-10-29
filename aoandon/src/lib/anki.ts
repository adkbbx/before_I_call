// Ghost-word export. Anki reads the header lines (#separator, #html, #columns, #tags column) on import.
import type { GhostWord } from './night.ts';

const sourceLabel: Record<GhostWord['source'], string> = { jlpt: 'JLPT list', model: 'Gemma gloss', story: 'story word' };

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cell(text: string): string {
  return escapeHtml(text).replace(/[\t\r\n]+/g, ' ').trim();
}

/** Front: word and reading. Back: gloss, gloss source, the sentence it came from and the tale credit. */
export function toAnkiTsv(ghosts: GhostWord[], credit: (taleId: string) => string): string {
  const header = ['#separator:tab', '#html:true', '#columns:Front\tBack\tTags', '#tags column:3'];
  const rows = ghosts.map(ghost => {
    const front = ghost.reading && ghost.reading !== ghost.word ? `${cell(ghost.word)}<br><small>${cell(ghost.reading)}</small>` : cell(ghost.word);
    const back = [
      cell(ghost.gloss ?? ''),
      `<small>${cell(sourceLabel[ghost.source])}</small>`,
      cell(ghost.sentence),
      `<small>${cell(credit(ghost.taleId))}</small>`,
    ].filter(Boolean).join('<br>');
    return [front, back, `aoandon aoandon::${ghost.taleId}`].join('\t');
  });
  return [...header, ...rows].join('\n') + '\n';
}

function csvCell(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(ghosts: GhostWord[], credit: (taleId: string) => string): string {
  const rows = [['word', 'reading', 'gloss', 'gloss_source', 'sentence', 'tale', 'credit']];
  for (const ghost of ghosts) {
    rows.push([ghost.word, ghost.reading ?? '', ghost.gloss ?? '', sourceLabel[ghost.source], ghost.sentence, ghost.taleId, credit(ghost.taleId)]);
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
