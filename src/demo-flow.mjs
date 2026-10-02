import { slowPhrase, repeatPhrase, callWords } from './call-phrases.mjs';

// Pure transitions shared by the UI and meaningful scenario checks.
export function nextTurn(index, turnCount) {
  if (!Number.isInteger(index) || index < 0 || index >= turnCount) throw new RangeError('Invalid demo turn');
  return index + 1 < turnCount ? { kind: 'turn', index: index + 1 } : { kind: 'finished' };
}

export function buildCallCard({ scenario, messages, opening, openingRomaji = '', openingMeaning = '', words = callWords }) {
  return [
    'BEFORE I CALL · Practice card',
    '', 'My situation', scenario,
    '', 'Useful opening', opening, openingRomaji, openingMeaning,
    '', 'Ask them to slow down', slowPhrase.japanese, slowPhrase.romaji, slowPhrase.meaning,
    '', 'Ask them to repeat', repeatPhrase.japanese, repeatPhrase.romaji, repeatPhrase.meaning,
    '', 'Useful words',
    ...words.map(word => `${word.japanese} · ${word.romaji} · ${word.meaning}`),
    '', 'Practice transcript',
    ...messages.map(message => `${message.role === 'assistant' ? 'Practice partner' : 'You'}: ${message.text}`),
    '', 'This was an AI or guided rehearsal. No real appointment has been booked.',
  ].join('\n');
}
