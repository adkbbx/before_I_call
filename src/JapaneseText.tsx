import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import lexicon from './japanese-lexicon.json';
import demo from './demo.json';
import extraDemos from './extra-demos.json';
import scenarios from './scenarios.json';
import { repairOpening, politeOpening, slowPhrase, repeatPhrase, callWords } from './call-phrases.mjs';
import { request } from './api';

const segmentSchema = z.object({ text: z.string(), reading: z.string(), meaning: z.string() });
const annotationSchema = z.object({ segments: z.array(segmentSchema), romaji: z.string() });
type Segment = z.infer<typeof segmentSchema>;
const knownRomaji = new Map<string, string>([
  ...[demo, ...extraDemos].flatMap(item => item.turns).flatMap(turn => [[turn.japanese, turn.romaji], [turn.answer, turn.answerRomaji]] satisfies [string, string][]),
  ...[repairOpening, politeOpening, slowPhrase, repeatPhrase, ...callWords, ...scenarios.flatMap(item => item.words)].map(item => [item.japanese, item.romaji] satisfies [string, string]),
  ['もしもし。', 'Moshi moshi.'], ['大丈夫。', 'Daijōbu.'],
]);
const words = [...lexicon].sort((a, b) => b.text.length - a.text.length);
export function annotateJapanese(text: string): Segment[] {
  const result: Segment[] = [];
  let offset = 0;
  while (offset < text.length) {
    const word = words.find(item => text.startsWith(item.text, offset));
    if (word) { result.push(word); offset += word.text.length; }
    else { const previous = result.at(-1); const char = text[offset++]; if (previous && !previous.reading) previous.text += char; else result.push({ text: char, reading: '', meaning: '' }); }
  }
  return result;
}

export function JapaneseText({ text, sessionId, showRomaji = true }: { text: string; sessionId?: string; showRomaji?: boolean }) {
  const [annotation, setAnnotation] = useState<{ text: string; segments: Segment[]; romaji: string } | null>(null);
  useEffect(() => {
    if (!text || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(text) || (!sessionId && !showRomaji)) return;
    const controller = new AbortController();
    request('/api/readings', annotationSchema, { method: 'POST', body: JSON.stringify({ text }), signal: controller.signal }).then(data => {
      if (data.segments.map(item => item.text).join('') === text) setAnnotation({ text, segments: data.segments, romaji: data.romaji });
    }).catch(() => { /* Known vocabulary remains readable if contextual annotation is unavailable. */ });
    return () => controller.abort();
  }, [text, sessionId, showRomaji]);
  const segments = annotation?.text === text ? annotation.segments : annotateJapanese(text);
  const romaji = knownRomaji.get(text) ?? (annotation?.text === text ? annotation.romaji : '');
  return <span className={`japanese-text notranslate ${/[\u3040-\u30ff\u4e00-\u9fff]/.test(text) ? '' : 'english-text'}`} lang={/[\u3040-\u30ff\u4e00-\u9fff]/.test(text) ? 'ja' : 'en'} translate="no">{segments.map((segment, i) => segment.reading && segment.meaning ? <Word key={`${text}-${i}`} segment={segment} /> : <span key={i}>{segment.text}</span>)}{showRomaji && romaji && <span className="japanese-romaji" lang="ja-Latn">{romaji}</span>}</span>;
}

function Word({ segment }: { segment: Segment }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!anchor.current || !tooltip.current) return;
      const word = anchor.current.getBoundingClientRect();
      const popup = tooltip.current.getBoundingClientRect();
      const left = Math.max(12, Math.min(word.left + word.width / 2 - popup.width / 2, window.innerWidth - popup.width - 12));
      const above = word.top - popup.height - 10;
      const top = Math.max(12, Math.min(above >= 12 ? above : word.bottom + 10, window.innerHeight - popup.height - 12));
      setPosition({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  return <span className={`word-wrap ${open ? 'word-open' : ''}`}><button ref={anchor} type="button" className="kanji-word" aria-label={`${segment.text}, ${segment.reading}: ${segment.meaning}`} aria-describedby={open ? id : undefined} aria-expanded={open} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); } }}><ruby>{segment.text}<rt>{segment.reading}</rt></ruby></button>{open && createPortal(<span ref={tooltip} style={position} className="word-meaning" id={id} role="tooltip" lang="en"><strong>{segment.text} · {segment.reading}</strong>{segment.meaning}</span>, document.body)}</span>;
}


