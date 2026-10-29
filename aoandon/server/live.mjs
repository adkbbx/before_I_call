// Local-only API for the "retell again" control. The deployed static site never needs it.
// GET  /api/health  -> { ok, provider, model }
// POST /api/retell  { taleId, sceneId, level } -> Retelling (P2 wires this to pipeline/retell.mjs with the ollama provider)
import { createServer } from 'node:http';
import { livePort, providers } from '../pipeline/config.mjs';

const send = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/health') return send(response, 200, { ok: true, provider: 'ollama', model: providers.ollama.model });
  if (request.method === 'POST' && request.url === '/api/retell') return send(response, 501, { error: 'Live retelling is built in P2.' });
  return send(response, 404, { error: 'Not found' });
});

server.listen(livePort, '127.0.0.1', () => console.log(`Aoandon live API on http://127.0.0.1:${livePort}`));
