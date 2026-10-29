// Loads pipeline output from public/tales. Every file is validated; invalid data is an error, never a silent partial.
import { taleIndexSchema, taleSchema, type Tale, type TaleIndex } from './schema.ts';

const base = `${import.meta.env.BASE_URL}tales/`;

export async function loadTaleIndex(signal?: AbortSignal): Promise<TaleIndex> {
  const response = await fetch(`${base}index.json`, { signal });
  if (!response.ok) throw new Error(`The tale shelf could not be loaded (${response.status}). Try again in a moment.`);
  return taleIndexSchema.parse(await response.json());
}

export async function loadTale(id: string, signal?: AbortSignal): Promise<Tale> {
  const response = await fetch(`${base}${id}.json`, { signal });
  if (!response.ok) throw new Error(`Tale "${id}" is missing (${response.status}).`);
  return taleSchema.parse(await response.json());
}
