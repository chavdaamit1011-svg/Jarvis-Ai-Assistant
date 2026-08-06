export type EntityMention = { original: string; normalized: string };
export type NormalizerCorrection = { original: string; corrected: string; confidence: number };
export type UniversalNormalization = {
  rawQuery: string; cleanedQuery: string; normalizedMeaning: string; detectedLanguage: string; responseLanguage: string;
  entityMentions: EntityMention[]; requestedFields: string[]; temporalExpressions: string[]; numericExpressions: string[];
  corrections: NormalizerCorrection[]; confidence: number; normalizerMethod: 'deterministic' | 'ai' | 'fallback'; fallbackUsed: boolean;
};
export type NormalizerInput = { rawQuery: string; conversationContext?: unknown };
export type SemanticNormalizer = (input: NormalizerInput & { cleanedQuery: string }) => Promise<UniversalNormalization>;
