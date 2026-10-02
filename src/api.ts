import { z } from 'zod';

export const healthSchema = z.object({ ok: z.boolean(), live_available: z.boolean(), max_call_seconds: z.number(), access_code_required: z.boolean() });
export const startSchema = z.object({ session_id: z.string(), room_url: z.string().url(), token: z.string() });
export const snapshotSchema = z.object({ status: z.enum(['connecting', 'listening', 'thinking', 'speaking', 'paused', 'ended', 'error']), messages: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string(), at: z.number() })), last_reply: z.string(), elapsed: z.number() });
export const explanationSchema = z.object({ explanation: z.string() });

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ detail: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.detail : 'The connection failed. Please try again.');
  }
  return schema.parse(data);
}

export async function command(sessionId: string, action: 'pause' | 'resume' | 'retry' | 'text', text = '') {
  return request(`/api/sessions/${sessionId}/control`, z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify({ action, text }) });
}
