// P2: retell each scene at each level with an open-weight model, enforce the level with the checker, record evidence.
// CLI: node pipeline/retell.mjs --provider ollama|hosted --levels N5,N4,N3 --tales mujina,chawan|all [--scenes s01,s02]
// Contract (PLAN.md "Retell loop" and "Providers"):
//   1. Prompt in JSON mode as Setsu Koizumi retelling aloud to a learner: level word policy, sentence caps from
//      config.sentenceCaps, keep every event in order, no new events or names, story words allowed. Output
//      { sentences: string[], question: { prompt: string, options: [string, string, string], answer: 0|1|2 } }.
//   2. Check with check.mjs. Below config.targets[level], send only the offending sentences back with
//      "rewrite without: [...]", up to config.maxRetries.
//   3. Remaining ghost words get glosses: JLPT meaning from a higher level if found (gs 'jlpt'), else a model gloss (gs 'model').
//   4. The question is checked at the same level as the retelling.
//   5. Save { request, response, metrics } per scene in data/runs/<provider>/<level>/<taleId>-<sceneId>.json.
//      Never write API keys to disk or logs.
//   6. Bad JSON: repair once, re-ask once, then mark the scene failed and continue. Exit code 1 if any scene failed.

console.error('TODO(P2): implement retell.mjs');
process.exitCode = 1;
