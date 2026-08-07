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
type EvidenceOptions = { requestedFields?: string[] };

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

const MAX_FACT_LENGTH = 280;
const EDUCATION_PATTERN = /\b(?:education|academic|qualification|degree|college|university|institute|school|bachelor|master|diploma|certificate|certification|course|stud(?:y|ied|ies|ying)|pursuing|attending|b\.?com|m\.?c\.?a|b\.?tech|m\.?tech|ph\.?d|20\d{2}\s*[-–]\s*(?:20\d{2}|present|ongoing))\b/i;
const PROJECT_PATTERN = /\b(?:project|built|created|developed|application|e-commerce|ecommerce|website|store)\b/i;
const SKILL_PATTERN = /\b(?:skills?|technolog(?:y|ies)|tech stack|tools?|languages?|frontend|backend)\b/i;
const EXPERIENCE_PATTERN = /\b(?:experience|worked|employment|career|fresher)\b/i;
const SUMMARY_PATTERN = /\b(?:is a|works? (?:with|as|on)|owner of|founder of|role:|profession(?:al)?\s+summary)\b/i;

function units(text: string) {
  const lines = text
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map(cleanText)
    .filter((line) => line.length >= 2 && /[\p{L}\p{N}]/u.test(line));
  // Never turn an unsplit 2,000-character chunk into a fact. A bounded
  // fragment is safer than exposing raw source content as a final answer.
  return lines.flatMap((line) => line.length <= MAX_FACT_LENGTH ? [line] : line.match(new RegExp(`.{1,${MAX_FACT_LENGTH}}(?:\\s|$)`, 'g'))?.map(cleanText) ?? []);
}

function patternFor(fields: string[]) {
  if (fields.includes('education')) return EDUCATION_PATTERN;
  if (fields.includes('projects')) return PROJECT_PATTERN;
  if (fields.includes('skills') || fields.includes('technologies')) return SKILL_PATTERN;
  if (fields.includes('experience')) return EXPERIENCE_PATTERN;
  if (fields.includes('summary') || fields.includes('profession') || fields.includes('role') || fields.includes('ownership')) return SUMMARY_PATTERN;
  return null;
}

function educationFacts(text: string) {
  const patterns = [
    /\b(?:pursuing|completed|attending|studying|studied|have pursued)?\s*(?:Bachelor(?:'s)?|Master(?:'s)?|Diploma|B\.?Com|M\.?C\.?A|B\.?Tech|M\.?Tech|Ph\.?D)[^.!\n]{0,190}/gi,
    /\b(?:(?:[\p{L}][\p{L}&.'-]{1,30})\s+){0,4}(?:University|College|Institute|School)\b[^.!\n]{0,120}/giu,
    /\b20\d{2}\s*[-–]\s*(?:20\d{2}|present|ongoing)\b/gi,
    /\b(?:certification|certificate|course)\b[^.!\n]{0,180}/gi,
  ];
  return patterns.flatMap((pattern) => text.match(pattern) ?? []).map(cleanText).filter((fact) => fact.length >= 3 && fact.length <= MAX_FACT_LENGTH);
}

function extractFieldFacts(values: string[], fields: string[]) {
  const pattern = patternFor(fields);
  const extracted = values.flatMap((value) => {
    if (fields.includes('education')) {
      const direct = educationFacts(value);
      return direct.length ? direct : units(value).filter((unit) => EDUCATION_PATTERN.test(unit));
    }
    const selected = units(value).filter((unit) => !pattern || pattern.test(unit));
    return selected;
  });
  return unique(extracted).slice(0, 16);
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
export function buildEvidence(result: EvidenceInput, options: EvidenceOptions = {}): Evidence {
  const source = sourceFor(result);
  const rawChunks = source === 'knowledge' ? result.sources : [];
  const requestedFields = options.requestedFields ?? [];
  const sourceValues = source === 'knowledge'
    ? [...result.supportedFacts.flatMap(valuesFromFact), ...rawChunks.map(chunkText)]
    : [];
  const facts = source === 'knowledge'
    // Atomic structured facts are already projected by the structured query
    // engine. Re-filtering them with chunk-text heuristics can erase valid
    // names, counts, and URLs, so preserve their exact source-backed values.
    ? result.answerSource === 'structured_data'
      ? unique(result.supportedFacts.flatMap(valuesFromFact))
      : extractFieldFacts(sourceValues, requestedFields)
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
    metadata: source === 'utility'
      ? { parsedArguments: record(result.data)?.metadata ?? null, toolResult: result.data }
      : { capability: result.capability, answerSource: result.answerSource, requestedFields, data: result.data, ...record(result.traceMetadata) },
    warnings,
  };
}
