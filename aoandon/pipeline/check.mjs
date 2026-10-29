// P2: the level checker. Turns Japanese text into pre-tokenised words and measures coverage at a level.
// Contract (PLAN.md "Checker"):
//   tokenizeForLevel(text, level, { storyWords, vocab }) -> { tokens: Token[], coverage, offending: string[] }
//   - Token kinds: 'known' | 'story' | 'ghost' | 'plain' (see src/lib/schema.ts).
//   - Content words: nouns except proper nouns, numbers and pronouns; verbs; i-adjectives; na-adjective stems; adverbs.
//     Particles, auxiliaries, symbols, and ます/です/た are 'plain'.
//   - 'known' when base form, surface or hiragana reading is in the cumulative set for the level
//     (kana-only vocab entries match on reading). Story words are 'story' and excluded from the denominator.
//   - coverage = known / (known + ghost); 1 when there are no counted words.
//   - offending = unique base forms of ghost tokens, in order of first appearance.

export function tokenizeForLevel(_text, _level, _options) {
  throw new Error('TODO(P2): tokenizeForLevel');
}
