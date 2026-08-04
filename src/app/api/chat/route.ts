import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { z } from 'zod';
import {
  CHAT_LIMITS,
  DEFAULT_MODEL_ID,
  TEMPERATURE_DEFAULTS,
  TOKEN_LIMITS,
} from '@/lib/ai/constants';
import { ASSISTANT_MODES, buildSystemPrompt } from '@/lib/ai/prompts';

export const runtime = 'nodejs';

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(CHAT_LIMITS.maxMessageLength),
      })
    )
    .min(1)
    .max(CHAT_LIMITS.maxHistoryItems),
  mode: z.enum(ASSISTANT_MODES).optional().default('general'),
});

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    console.error('[API /api/chat] GROQ_API_KEY is not configured.');
    return jsonError('The AI service is not configured. Please try again later.', 503);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid JSON request body.', 400);
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(
      `Messages must contain 1-${CHAT_LIMITS.maxHistoryItems} non-empty user or assistant messages, each up to ${CHAT_LIMITS.maxMessageLength} characters.`,
      400
    );
  }

  try {
    const groq = createGroq({ apiKey });
    const system = buildSystemPrompt({
      mode: parsed.data.mode,
      preferredLanguage: 'same-as-user',
      responseStyle: 'balanced',
    });
    const result = streamText({
      model: groq(DEFAULT_MODEL_ID),
      messages: parsed.data.messages,
      system,
      temperature: TEMPERATURE_DEFAULTS.default,
      maxOutputTokens: TOKEN_LIMITS.defaultMaxTokens,
      abortSignal: req.signal,
      onError: ({ error }) => {
        // A streamed response has already sent headers, so provider details stay
        // in server logs instead of being exposed to the client.
        console.error('[API /api/chat] Stream error:', error);
      },
    });

    return result.toTextStreamResponse({
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const status = error instanceof Error && /rate limit|status code: 429/i.test(error.message) ? 429 : 502;
    console.error('[API /api/chat] Provider setup error:', error);
    return jsonError(
      status === 429
        ? 'The AI service is busy. Please wait a moment and try again.'
        : 'The AI service is temporarily unavailable. Please try again later.',
      status
    );
  }
}
