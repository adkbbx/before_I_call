import { z } from 'zod';

export const healthSchema = z.object({ ok: z.boolean(), preparation_available: z.boolean().optional(), live_available: z.boolean(), local_available: z.boolean().optional(), max_call_seconds: z.number(), access_code_required: z.boolean() });
export const localStartSchema = z.object({ session_id: z.string(), greeting: z.string(), audio: z.string(), max_call_seconds: z.number(), target_language: z.enum(['ja', 'en']), language: z.enum(['English', 'Japanese']), scenario_id: z.string(), model: z.string() });
export const localTurnSchema = z.object({ heard: z.string(), reply: z.string(), audio: z.string(), ended: z.boolean() });
export const startSchema = z.object({ session_id: z.string(), conversation_ref: z.string().optional(), prompt_version: z.string().optional(), conversation_token: z.string(), max_call_seconds: z.number(), prompt: z.string(), greeting: z.string(), scenario_id: z.string(), language: z.enum(['English', 'Japanese']), target_language: z.enum(['ja', 'en']), voice_id: z.string() });
export const snapshotSchema = z.object({ status: z.enum(['connecting', 'listening', 'thinking', 'speaking', 'paused', 'ended', 'error']), messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string(), at: z.number() })), last_reply: z.string(), elapsed: z.number() });

/** Reads a server error's detail, or a fallback when the body is not the usual JSON. */
export async function errorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const error = z.object({ detail: z.string() }).safeParse(await response.json());
    return error.success ? error.data.detail : fallback;
  } catch { return fallback; }
}

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ detail: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.detail : 'The connection failed. Please try again.');
  }
  return schema.parse(data);
}

