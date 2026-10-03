import { z } from 'zod';

export const healthSchema = z.object({ ok: z.boolean(), preparation_available: z.boolean().optional(), live_available: z.boolean(), max_call_seconds: z.number(), access_code_required: z.boolean() });
export const startSchema = z.object({ session_id: z.string(), conversation_token: z.string(), max_call_seconds: z.number(), prompt: z.string(), greeting: z.string(), scenario_id: z.string(), language: z.enum(['English', 'Japanese']), target_language: z.enum(['ja', 'en']), voice_id: z.string() });
export const snapshotSchema = z.object({ status: z.enum(['connecting', 'listening', 'thinking', 'speaking', 'paused', 'ended', 'error']), messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string(), at: z.number() })), last_reply: z.string(), elapsed: z.number() });

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ detail: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.detail : 'The connection failed. Please try again.');
  }
  return schema.parse(data);
}

