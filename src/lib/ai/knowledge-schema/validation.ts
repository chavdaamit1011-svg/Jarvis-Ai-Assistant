import { z } from 'zod';

export const entityTypeSchema = z.enum(['person', 'organization', 'project', 'product', 'technology', 'location', 'other']);
export const factValueTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'url', 'entity_reference', 'string_array']);
export const recordStatusSchema = z.enum(['active', 'rejected', 'conflicted', 'archived']);
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB ObjectId.');
const exactValueSchema = z.union([z.string().min(1), z.number(), z.boolean(), z.array(z.string().min(1)).min(1)]);

export const knowledgeSectionInputSchema = z.object({
  documentId: objectIdSchema,
  heading: z.string().max(300).default(''),
  text: z.string().min(1).max(50_000),
  pageNumber: z.number().int().positive().optional(),
  sectionPath: z.array(z.string().min(1).max(300)).max(30).default([]),
  order: z.number().int().min(0),
});

export const knowledgeEntityInputSchema = z.object({
  documentId: objectIdSchema.optional(),
  canonicalName: z.string().min(1).max(180),
  normalizedName: z.string().min(1).max(180),
  entityType: entityTypeSchema,
  aliases: z.array(z.string().min(1).max(180)).max(100).default([]),
  sourceSectionIds: z.array(objectIdSchema).max(500).default([]),
  confidence: z.number().min(0).max(1),
});

export const knowledgeFactInputSchema = z.object({
  entityId: objectIdSchema,
  entityName: z.string().min(1).max(180).optional(),
  entityType: entityTypeSchema.optional(),
  // Fields are deliberately dynamic, rather than an enum tied to one domain.
  field: z.string().min(1).max(120),
  value: exactValueSchema,
  normalizedValue: z.string().min(1).max(1_500),
  valueType: factValueTypeSchema,
  status: recordStatusSchema.default('active'),
  period: z.record(z.string(), z.unknown()).optional(),
  qualifiers: z.record(z.string(), z.unknown()).default({}),
  sourceDocumentId: objectIdSchema,
  sourceSectionId: objectIdSchema,
  sourceText: z.string().min(1).max(1_500),
  confidence: z.number().min(0).max(1),
});

export const knowledgeRelationshipInputSchema = z.object({
  subjectEntityId: objectIdSchema,
  relation: z.string().min(1).max(120),
  objectEntityId: objectIdSchema,
  qualifiers: z.record(z.string(), z.unknown()).default({}),
  sourceDocumentId: objectIdSchema,
  sourceSectionId: objectIdSchema,
  confidence: z.number().min(0).max(1),
});

/** Stable idempotency key; source text is intentionally not part of the key. */
export function knowledgeFactDedupeKey(input: unknown) {
  const fact = knowledgeFactInputSchema.parse(input);
  return [fact.entityId, fact.field, fact.normalizedValue, fact.sourceDocumentId, fact.sourceSectionId].join(':');
}

export function knowledgeRelationshipDedupeKey(input: unknown) {
  const relationship = knowledgeRelationshipInputSchema.parse(input);
  return [relationship.subjectEntityId, relationship.relation, relationship.objectEntityId, relationship.sourceDocumentId, relationship.sourceSectionId].join(':');
}
