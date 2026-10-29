export type FuriganaMode = 'above-level' | 'all' | 'off';
export type WritingMode = 'vertical' | 'horizontal';
export type Prefs = { writing?: WritingMode; furigana: FuriganaMode; sound: boolean };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const defaults: Prefs = { furigana: 'above-level', sound: false };
function storage(): Store | undefined { try { return globalThis.localStorage; } catch { return undefined; } }
export function loadPrefs(store = storage()): Prefs {
  try {
    const p = JSON.parse(store?.getItem('aoandon.prefs.v1') ?? '{}');
    return { writing: p?.writing === 'vertical' || p?.writing === 'horizontal' ? p.writing : undefined,
      furigana: ['above-level', 'all', 'off'].includes(p?.furigana) ? p.furigana : 'above-level', sound: p?.sound === true };
  } catch { return { ...defaults }; }
}
export function savePrefs(prefs: Prefs, store = storage()): boolean {
  try { store?.setItem('aoandon.prefs.v1', JSON.stringify(prefs)); return !!store; } catch { return false; }
}
