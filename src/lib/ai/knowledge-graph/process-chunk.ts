import 'server-only';

import type { GraphChunkInput, GraphEntityCandidate, GraphExtractionPayload, GraphProcessResult } from './graph-types';
import { extractAiFacts } from './extract-ai-facts';
import { extractDeterministicFacts } from './extract-deterministic-facts';
import { storeGraph } from './store-graph';

function isSupported(value: string, content: string) {
  return content.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());
}

function mergePayloads(content: string, deterministic: GraphExtractionPayload, ai: GraphExtractionPayload): GraphExtractionPayload {
  const entityIds = new Set(deterministic.entities.map((entity) => entity.temporaryId));
  const aiEntities = ai.entities.filter((entity) => isSupported(entity.name, content) && !entityIds.has(entity.temporaryId));
  const entities: GraphEntityCandidate[] = [...deterministic.entities, ...aiEntities];
  const validIds = new Set(entities.map((entity) => entity.temporaryId));
  const facts = [...deterministic.facts, ...ai.facts.filter((fact) => validIds.has(fact.subjectTemporaryId) && isSupported(fact.supportingText, content))];
  const relationships = [...deterministic.relationships, ...ai.relationships.filter((relationship) => validIds.has(relationship.sourceTemporaryId) && validIds.has(relationship.targetTemporaryId) && isSupported(relationship.supportingText, content))];
  const unique = <T>(values: T[], key: (value: T) => string) => [...new Map(values.map((value) => [key(value), value])).values()];
  return {
    entities: unique(entities, (entity) => entity.temporaryId),
    facts: unique(facts, (fact) => `${fact.subjectTemporaryId}:${fact.predicate}:${JSON.stringify(fact.value)}`),
    relationships: unique(relationships, (relationship) => `${relationship.sourceTemporaryId}:${relationship.relationshipType}:${relationship.targetTemporaryId}`),
  };
}

/** Standalone future-ingestion entry point. It is intentionally not wired to upload/chat. */
export async function processKnowledgeGraphChunk(input: GraphChunkInput, options: { enableAi?: boolean } = {}): Promise<GraphProcessResult> {
  const content = input.content.trim();
  if (!content) throw new Error('Cannot process an empty knowledge graph chunk.');
  const deterministic = extractDeterministicFacts(content);
  let payload = deterministic;
  let aiExtractionFailed = false;
  const warnings: string[] = [];
  if (options.enableAi) {
    try {
      payload = mergePayloads(content, deterministic, await extractAiFacts(content, deterministic));
    } catch (error) {
      aiExtractionFailed = true;
      warnings.push(error instanceof Error ? `AI extraction skipped: ${error.message}` : 'AI extraction skipped.');
    }
  }
  const stored = await storeGraph({ ...input, content }, payload);
  return { ...payload, ...stored, aiExtractionFailed, warnings };
}
