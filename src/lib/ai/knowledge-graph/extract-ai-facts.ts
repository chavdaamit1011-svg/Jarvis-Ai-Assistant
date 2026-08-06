import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { DEFAULT_MODEL_ID, TEMPERATURE_DEFAULTS } from '@/lib/ai/constants';
import { graphExtractionSchema, type GraphExtractionPayload } from './graph-types';

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as unknown;
}

/**
 * Extracts only additional facts explicitly stated in the chunk. Callers must
 * validate support against the original text before persistence.
 */
export async function extractAiFacts(content: string, deterministic: GraphExtractionPayload): Promise<GraphExtractionPayload> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) throw new Error('AI graph extraction is unavailable because GROQ_API_KEY is not configured.');
  const result = await generateText({
    model: createGroq({ apiKey })(DEFAULT_MODEL_ID),
    temperature: TEMPERATURE_DEFAULTS.precise,
    maxOutputTokens: 1200,
    system: `Extract a knowledge-graph JSON object. Return JSON only, with keys entities, facts, relationships. Include only facts explicitly stated in the supplied chunk. Do not infer, complete, or use outside knowledge. Use the exact supporting sentence or line from the chunk. Do not repeat deterministic values already supplied.`,
    prompt: `CHUNK:\n${content}\n\nDETERMINISTIC EXTRACTION ALREADY FOUND:\n${JSON.stringify(deterministic)}`,
  });
  return graphExtractionSchema.parse(parseJson(result.text));
}
