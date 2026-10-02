import { useEffect, useId, useState } from 'react';
import { z } from 'zod';
import lexicon from './japanese-lexicon.json';
import { request } from './api';

const segmentSchema = z.object({ text: z.string(), reading: z.string(), meaning: z.string() });
const annotationSchema = z.object({ segments: z.array(segmentSchema) });
type Segment = z.infer<typeof segmentSchema>;
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

export function JapaneseText({ text, sessionId }: { text: string; sessionId?: string }) {
  const [annotation, setAnnotation] = useState<{ text: string; segments: Segment[] } | null>(null);
  useEffect(() => {
    if (!sessionId || !text) return;
    const controller = new AbortController();
    request(`/api/sessions/${sessionId}/readings?text=${encodeURIComponent(text)}`, annotationSchema, { signal: controller.signal }).then(data => {
      if (data.segments.map(item => item.text).join('') === text) setAnnotation({ text, segments: data.segments });
    }).catch(() => { /* Known vocabulary remains readable if contextual annotation is unavailable. */ });
    return () => controller.abort();
  }, [text, sessionId]);
  const segments = annotation?.text === text ? annotation.segments : annotateJapanese(text);
  return <span className="japanese-text" lang="ja">{segments.map((segment, i) => segment.reading && segment.meaning ? <Word key={`${text}-${i}`} segment={segment} /> : <span key={i}>{segment.text}</span>)}</span>;
}

function Word({ segment }: { segment: Segment }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className={`word-wrap ${open ? 'word-open' : ''}`}><button type="button" className="kanji-word" aria-label={`${segment.text}, ${segment.reading}: ${segment.meaning}`} aria-describedby={open ? id : undefined} aria-expanded={open} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); } }}><ruby>{segment.text}<rt>{segment.reading}</rt></ruby></button>{open && <span className="word-meaning" id={id} role="tooltip" lang="en"><strong>{segment.text} · {segment.reading}</strong>{segment.meaning}</span>}</span>;
}
