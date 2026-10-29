// Data contracts shared by the pipeline output (public/tales/*.json) and the app. See PLAN.md "Data contracts".
import { z } from 'zod';

export const levels = ['N5', 'N4', 'N3'] as const;
export const levelSchema = z.enum(levels);
export type Level = z.infer<typeof levelSchema>;

/** One run of original Aozora text, with its own ruby when the source gives one. */
export const rubySchema = z.object({ base: z.string().min(1), rt: z.string().min(1).optional() });

/** A pre-tokenised word: surface, reading (hiragana), base form, kind, gloss and gloss source. */
export const tokenSchema = z.object({
  s: z.string().min(1),
  hk: z.literal(true).optional(),
  r: z.string().min(1).optional(),
  b: z.string().min(1).optional(),
  k: z.enum(['known', 'story', 'ghost', 'plain']),
  g: z.string().min(1).optional(),
  gs: z.enum(['jlpt', 'model']).optional(),
});

export const sentenceSchema = z.object({ tokens: z.array(tokenSchema).min(1) });

export const questionSchema = z.object({
  prompt: sentenceSchema,
  options: z.tuple([sentenceSchema, sentenceSchema, sentenceSchema]),
  answer: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export const metricsSchema = z.object({
  kanjiCoverage: z.number().min(0).max(1).optional(),
  kanjiDensity: z.number().min(0).max(1).optional(),
  firstCoverage: z.number().min(0).max(1),
  finalCoverage: z.number().min(0).max(1),
  retries: z.number().int().min(0),
  seconds: z.number().min(0),
  offendingFirst: z.array(z.string()),
  ghostWords: z.array(z.string()),
});

export const retellingSchema = z.object({
  level: levelSchema,
  model: z.string().min(1),
  provider: z.enum(['ollama', 'hosted']),
  sentences: z.array(sentenceSchema).min(1),
  question: questionSchema,
  metrics: metricsSchema,
});

export const sceneSchema = z
  .object({
    id: z.string().min(1),
    original: z.array(z.array(rubySchema).min(1)).min(1),
    retellings: z.object({
      N5: retellingSchema.optional(),
      N4: retellingSchema.optional(),
      N3: retellingSchema.optional(),
    }),
  })
  .superRefine((scene, ctx) => {
    for (const level of levels) {
      const retelling = scene.retellings[level];
      if (retelling && retelling.level !== level) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['retellings', level, 'level'], message: `retelling stored under ${level} says ${retelling.level}` });
      }
    }
  });

export const storyWordSchema = z.object({ text: z.string().min(1), reading: z.string().min(1), gloss: z.string().min(1) });

export const taleSchema = z.object({
  id: z.string().regex(/^[a-z]+$/),
  titleJa: z.string().min(1),
  titleEn: z.string().min(1),
  translator: z.string().min(1),
  aozoraCard: z.string().url(),
  colophon: z.string(),
  illustration: z.string().min(1),
  storyWords: z.array(storyWordSchema).max(8),
  scenes: z.array(sceneSchema).min(1),
});

export const taleIndexSchema = z.object({
  tales: z.array(
    z.object({
      id: z.string().regex(/^[a-z]+$/),
      titleJa: z.string().min(1),
      titleEn: z.string().min(1),
      translator: z.string().min(1),
      illustration: z.string().min(1),
      scenes: z.number().int().positive(),
      coverage: z.object({ N5: z.number().min(0).max(1).optional(), N4: z.number().min(0).max(1).optional(), N3: z.number().min(0).max(1).optional() }),
    }),
  ),
});

export type Ruby = z.infer<typeof rubySchema>;
export type Token = z.infer<typeof tokenSchema>;
export type Sentence = z.infer<typeof sentenceSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type Retelling = z.infer<typeof retellingSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type StoryWord = z.infer<typeof storyWordSchema>;
export type Tale = z.infer<typeof taleSchema>;
export type TaleIndex = z.infer<typeof taleIndexSchema>;

/** The credit line every tale must show (PLAN.md product rule 1). */
export function creditLine(tale: Pick<Tale, 'translator'>): string {
  return `Lafcadio Hearn, tr. ${tale.translator}, Aozora Bunko`;
}
