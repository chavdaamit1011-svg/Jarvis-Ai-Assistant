import { z } from 'zod';
import type { KnowledgeGraphEntityType, KnowledgeGraphValueType } from './types';

export type GraphEntityCandidate = {
  temporaryId: string;
  entityType: KnowledgeGraphEntityType;
  name: string;
  aliases: string[];
};

export type GraphFactCandidate = {
  subjectTemporaryId: string;
  predicate: string;
  value: string | number | boolean | string[];
  valueType: KnowledgeGraphValueType;
  confidence: number;
  supportingText: string;
};

export type GraphRelationshipCandidate = {
  sourceTemporaryId: string;
  relationshipType: string;
  targetTemporaryId: string;
  confidence: number;
  supportingText: string;
};

export type GraphExtractionPayload = {
  entities: GraphEntityCandidate[];
  facts: GraphFactCandidate[];
  relationships: GraphRelationshipCandidate[];
};

export type GraphChunkInput = {
  documentId: string;
  chunkId: string;
  content: string;
  graphVersion?: string;
};

export type GraphProcessResult = GraphExtractionPayload & {
  persistedEntityIds: Record<string, string>;
  entitiesCreated: number;
  persistedFactCount: number;
  persistedRelationshipCount: number;
  conflictsFound: number;
  aiExtractionFailed: boolean;
  warnings: string[];
};

const entityTypeSchema = z.enum(['person', 'organization', 'project', 'product', 'technology', 'location', 'other']);
const valueTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'url', 'entity_reference', 'string_array']);
const factValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

export const graphExtractionSchema = z.object({
  entities: z.array(z.object({
    temporaryId: z.string().min(1).max(100),
    entityType: entityTypeSchema,
    name: z.string().min(1).max(180),
    aliases: z.array(z.string().min(1).max(180)).max(20).default([]),
  })).max(50),
  facts: z.array(z.object({
    subjectTemporaryId: z.string().min(1).max(100),
    predicate: z.string().min(1).max(120),
    value: factValueSchema,
    valueType: valueTypeSchema,
    confidence: z.number().min(0).max(1),
    supportingText: z.string().min(1).max(1500),
  })).max(100),
  relationships: z.array(z.object({
    sourceTemporaryId: z.string().min(1).max(100),
    relationshipType: z.string().min(1).max(120),
    targetTemporaryId: z.string().min(1).max(100),
    confidence: z.number().min(0).max(1),
    supportingText: z.string().min(1).max(1500),
  })).max(100),
});
