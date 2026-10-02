// Pure transitions shared by the UI and meaningful scenario checks.
export function nextTurn(index, turnCount) {
  if (!Number.isInteger(index) || index < 0 || index >= turnCount) throw new RangeError('Invalid demo turn');
  return index + 1 < turnCount ? { kind: 'turn', index: index + 1 } : { kind: 'finished' };
}

/** @param {{scenario: string, messages: {role: string, text: string}[], phrases?: {role: string, turn: number, japanese: string, romaji: string}[], words?: {japanese: string, romaji: string, meaning: string}[]}} card */
export function buildCallCard({ scenario, messages, phrases = [], words = [] }) {
  return [
    'BEFORE I CALL · Practice card',
    '', 'My situation', scenario,
    '', 'Phrases from this conversation',
    ...phrases.flatMap(phrase => [`Turn ${phrase.turn} · ${phrase.role === 'user' ? 'You' : 'Practice partner'}`, phrase.japanese, phrase.romaji]),
    '', 'Useful words',
    ...words.map(word => `${word.japanese} · ${word.romaji} · ${word.meaning}`),
    '', 'Practice transcript',
    ...messages.map(message => `${message.role === 'assistant' ? 'Practice partner' : 'You'}: ${message.text}`),
    '', 'This was an AI or guided rehearsal. No real appointment has been booked.',
  ].join('\n');
}
