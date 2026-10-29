// Verify the P2b artifact gate without making model or network calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, tales, levels } from './config.mjs';
import { taleSchema, taleIndexSchema } from '../src/lib/schema.ts';

const read = file => JSON.parse(readFileSync(file, 'utf8'));

export function verifyHosted() {
  const index = taleIndexSchema.parse(read(join(paths.publicTales, 'index.json')));
  assert.deepEqual(index.tales.map(t => t.id).sort(), tales.map(t => t.id).sort());
  const summary = [];
  for (const config of tales) {
    const tale = taleSchema.parse(read(join(paths.publicTales, `${config.id}.json`)));
    const source = read(join(paths.source, `${config.id}.json`));
    const entry = index.tales.find(t => t.id === config.id);
    assert.equal(tale.scenes.length, source.scenes.length);
    assert.equal(entry.scenes, tale.scenes.length);
    for (const level of levels) {
      const runs = [];
      for (const scene of tale.scenes) {
        assert.deepEqual(scene.original, source.scenes.find(s => s.id === scene.id).original);
        const run = read(join(paths.runs, 'hosted', level, `${tale.id}-${scene.id}.json`));
        assert.ok(!run.failed, `${tale.id}/${scene.id}/${level} failed`);
        assert.equal(run.retelling.provider, 'hosted');
        assert.deepEqual(scene.retellings[level], run.retelling);
        for (const sentence of [...run.retelling.sentences, run.retelling.question.prompt, ...run.retelling.question.options]) {
          for (const token of sentence.tokens) {
            if (token.k === 'ghost') assert.ok(token.g && token.gs, 'Ghost word missing its gloss');
          }
        }
        runs.push(run);
      }
      const mean = field => runs.reduce((n, r) => n + r.metrics[field], 0) / runs.length;
      assert.equal(entry.coverage[level], mean('finalCoverage'));
      summary.push({ level, tale: tale.id, scenes: runs.length, firstCoverage: mean('firstCoverage'), finalCoverage: mean('finalCoverage'), retries: runs.reduce((n, r) => n + r.metrics.retries, 0), failures: 0 });
    }
  }
  const metrics = readFileSync(paths.metrics, 'utf8');
  for (const level of levels) assert.ok(metrics.includes(`## hosted / ${level}`));
  assert.ok(metrics.includes('## ollama / N4'));
  return summary;
}

if (process.argv[1]?.endsWith('verify-hosted.mjs')) {
  const summary = verifyHosted();
  console.table(summary.map(row => ({ ...row, firstCoverage: row.firstCoverage.toFixed(3), finalCoverage: row.finalCoverage.toFixed(3) })));
  console.log('P2b artifacts verified: 5 tales, 159 hosted scene/level runs, hosted and Ollama metrics.');
}
