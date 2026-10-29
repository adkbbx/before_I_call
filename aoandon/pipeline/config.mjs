// Pipeline configuration. Reads .env.local (gitignored) without printing secrets.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const paths = {
  source: join(root, 'data', 'source'),
  jlpt: join(root, 'data', 'jlpt'),
  runs: join(root, 'data', 'runs'),
  publicTales: join(root, 'public', 'tales'),
  metrics: join(root, 'docs', 'metrics.md'),
};

export const levels = /** @type {const} */ (['N5', 'N4', 'N3']);

/** Coverage the checker loop aims for before it stops retrying (PLAN.md, Retell loop). */
export const targets = { N5: 0.95, N4: 0.95, N3: 0.97 };

/** Sentence length caps in characters per level. */
export const sentenceCaps = { N5: 20, N4: 28, N3: 40 };

export const maxRetries = 3;

export const tales = [
  { id: 'mujina', titleJa: '貉', titleEn: 'Mujina', translator: '戸川明三', aozoraCard: 'https://www.aozora.gr.jp/cards/000258/card42928.html' },
  { id: 'chawan', titleJa: '茶碗の中', titleEn: 'In a Cup of Tea', translator: '田部隆次', aozoraCard: 'https://www.aozora.gr.jp/cards/000258/card59429.html' },
  { id: 'yukionna', titleJa: '雪女', titleEn: 'Yuki-Onna', translator: '田部隆次', aozoraCard: 'https://www.aozora.gr.jp/cards/000258/card50326.html' },
  { id: 'rokurokubi', titleJa: 'ろくろ首', titleEn: 'Rokuro-Kubi', translator: '田部隆次', aozoraCard: 'https://www.aozora.gr.jp/cards/000258/card50327.html' },
  { id: 'hoichi', titleJa: '耳無芳一の話', titleEn: 'The Story of Mimi-Nashi-Hoichi', translator: '戸川明三', aozoraCard: 'https://www.aozora.gr.jp/cards/000258/card42927.html' },
];

export const jlptSources = {
  N5: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv',
  N4: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv',
  N3: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n3.csv',
  N2: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n2.csv',
  N1: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n1.csv',
};

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trimStart().startsWith('#')) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

const fileEnv = readEnvFile(join(root, '.env.local'));
const env = name => process.env[name] ?? fileEnv[name] ?? '';

export const providers = {
  ollama: {
    name: 'ollama',
    baseUrl: env('OLLAMA_URL') || 'http://127.0.0.1:11434',
    model: env('LOCAL_MODEL') || 'gemma4:e2b-it-qat',
  },
  hosted: {
    name: 'hosted',
    baseUrl: env('HOSTED_BASE_URL') || 'https://inference.do-ai.run/v1',
    model: env('HOSTED_MODEL') || 'gemma-4-31B-it',
    /** Never log this value. */
    apiKey: env('GRADIENT_MODEL_ACCESS_KEY'),
  },
};

export const livePort = Number(env('LIVE_PORT') || 8790);
