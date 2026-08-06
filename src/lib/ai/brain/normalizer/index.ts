import { universalNormalizationSchema } from './normalizer-schema';
import { detectQueryLanguage } from './detect-language';
import { normalizeText } from './normalize-text';
import { normalizeEntityMentions } from './normalize-entities';
import { normalizeRequestedFields } from './normalize-requested-fields';
import type { NormalizerInput, SemanticNormalizer, UniversalNormalization } from './normalizer-types';

function values(query: string, pattern: RegExp) { return [...query.matchAll(pattern)].map((match) => match[0]); }
async function withTimeout<T>(task: Promise<T>, milliseconds: number) { return Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('normalizer timeout')), milliseconds))]); }

export async function normalizeQuery(input: NormalizerInput, options: { semanticNormalizer?: SemanticNormalizer; timeoutMs?: number } = {}): Promise<UniversalNormalization> {
  const deterministic = () => {
    const text = normalizeText(input.rawQuery); const language = detectQueryLanguage(text.cleanedQuery);
    return universalNormalizationSchema.parse({ rawQuery: input.rawQuery, cleanedQuery: text.cleanedQuery, normalizedMeaning: text.cleanedQuery, detectedLanguage: language.detectedLanguage, responseLanguage: language.responseLanguage, entityMentions: normalizeEntityMentions(input.rawQuery, text.cleanedQuery), requestedFields: normalizeRequestedFields(text.cleanedQuery), temporalExpressions: values(text.cleanedQuery, /\b(?:today|tomorrow|yesterday|current|latest|now|aaj|abhi|haal|atyare|aaje)\b/gi), numericExpressions: values(text.cleanedQuery, /\b\d+(?:\.\d+)?%?|\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/g), corrections: text.corrections, confidence: Math.min(0.95, language.confidence * 0.8 + (text.corrections.length ? 0.1 : 0.15)), normalizerMethod: 'deterministic', fallbackUsed: false });
  };
  const fallback = deterministic();
  if (!options.semanticNormalizer || fallback.confidence >= 0.85) return fallback;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ai = await withTimeout(options.semanticNormalizer({ ...input, cleanedQuery: fallback.cleanedQuery }), options.timeoutMs ?? 1_500);
      return universalNormalizationSchema.parse({ ...ai, rawQuery: input.rawQuery, cleanedQuery: fallback.cleanedQuery, normalizerMethod: 'ai', fallbackUsed: false });
    } catch { /* one bounded retry; deterministic fallback below */ }
  }
  return { ...fallback, normalizerMethod: 'fallback', fallbackUsed: true };
}

export * from './normalizer-types';
export * from './normalizer-schema';
export * from './normalize-text';
export * from './detect-language';
export * from './normalize-entities';
export * from './normalize-requested-fields';
