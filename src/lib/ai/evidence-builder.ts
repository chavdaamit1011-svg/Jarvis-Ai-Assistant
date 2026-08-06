import type { ExecutionResult } from '@/lib/ai/brain/executor';

export type EvidenceSource = 'knowledge' | 'general' | 'utility' | 'web';
export type EvidenceCitation = {
  documentId?: string;
  chunkId?: string;
  documentTitle?: string;
  chunkIndex?: number;
};

export type Evidence = {
  source: EvidenceSource;
  confidence: number;
  language: string;
  facts: string[];
  urls: string[];
  citations: EvidenceCitation[];
  rawChunks: unknown[];
  metadata: Record<string, unknown>;
  warnings: string[];
};

type EvidenceInput = Pick<ExecutionResult, 'capability' | 'answerSource' | 'data' | 'supportedFacts' | 'sources' | 'conflicts' | 'traceMetadata'>;

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()\[\]{}"']+/gi;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function valuesFromFact(value: unknown): string[] {
  if (typeof value === 'string') return [cleanText(value)];
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(valuesFromFact);
  const item = record(value);
  if (!item) return [];
  const direct = item.value ?? item.text ?? item.fact ?? item.supportingText;
  return direct === undefined ? [] : valuesFromFact(direct);
}

function chunkText(value: unknown) {
  const item = record(value);
  if (!item) return typeof value === 'string' ? value : '';
  return typeof item.content === 'string' ? item.content : typeof item.supportingText === 'string' ? item.supportingText : typeof item.text === 'string' ? item.text : '';
}

function factsFromChunks(chunks: unknown[]) {
  return chunks.flatMap((chunk) => chunkText(chunk)
    .split(/\r?\n/)
    .map(cleanText)
    .filter((line) => line.length >= 2 && /[\p{L}\p{N}]/u.test(line)));
}

function citationsFromSources(sources: unknown[]): EvidenceCitation[] {
  const seen = new Set<string>();
  return sources.flatMap((source) => {
    const item = record(source);
    if (!item) return [];
    const citation: EvidenceCitation = {
      documentId: typeof item.documentId === 'string' ? item.documentId : undefined,
      chunkId: typeof item.chunkId === 'string' ? item.chunkId : undefined,
      documentTitle: typeof item.documentTitle === 'string' ? item.documentTitle : undefined,
      chunkIndex: typeof item.chunkIndex === 'number' ? item.chunkIndex : undefined,
    };
    const key = `${citation.documentId ?? ''}:${citation.chunkId ?? ''}:${citation.documentTitle ?? ''}:${citation.chunkIndex ?? ''}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [citation];
  });
}

function sourceFor(result: EvidenceInput): EvidenceSource {
  if (result.capability === 'utility' || result.answerSource === 'tool') return 'utility';
  if (result.capability === 'web_search' || result.answerSource === 'web') return 'web';
  if (result.answerSource === 'knowledge_graph' || result.answerSource === 'structured_data' || result.answerSource === 'rag') return 'knowledge';
  return 'general';
}

function confidenceFor(result: EvidenceInput) {
  const trace = record(result.traceMetadata);
  const data = record(result.data);
  const candidate = trace?.confidence ?? data?.confidence;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, Math.min(1, candidate)) : 0;
}

function languageFor(result: EvidenceInput) {
  const trace = record(result.traceMetadata);
  const data = record(result.data);
  const language = trace?.responseLanguage ?? trace?.language ?? data?.responseLanguage ?? data?.language;
  return typeof language === 'string' && language.trim() ? language.trim() : 'und';
}

/**
 * Converts a completed capability result into evidence only. It deliberately
 * does not produce a user-facing sentence or infer facts absent from sources.
 */
export function buildEvidence(result: EvidenceInput): Evidence {
  const source = sourceFor(result);
  const rawChunks = source === 'knowledge' ? result.sources : [];
  const facts = source === 'knowledge'
    ? unique([...result.supportedFacts.flatMap(valuesFromFact), ...factsFromChunks(rawChunks)])
    : source === 'utility'
      ? unique(result.supportedFacts.flatMap(valuesFromFact).concat(valuesFromFact(record(result.data)?.metadata ?? result.data)))
      : [];
  const urls = unique([...facts, ...rawChunks.map(chunkText)].flatMap((text) => text.match(URL_PATTERN) ?? []));
  const warnings = result.conflicts.length ? ['Conflicting evidence is present.'] : [];

  return {
    source,
    confidence: confidenceFor(result),
    language: languageFor(result),
    facts,
    urls,
    citations: source === 'knowledge' ? citationsFromSources(result.sources) : [],
    rawChunks,
    metadata: source === 'utility' ? { parsedArguments: record(result.data)?.metadata ?? null, toolResult: result.data } : { capability: result.capability, answerSource: result.answerSource },
    warnings,
  };
}
