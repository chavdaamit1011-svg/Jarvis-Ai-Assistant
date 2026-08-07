import { extractDeterministicFacts } from '@/lib/ai/knowledge-graph/extract-deterministic-facts';
import type { CanonicalEntityType, CanonicalFactValueType } from '@/lib/ai/knowledge-schema';

export const STRUCTURED_KNOWLEDGE_EXTRACTION_VERSION = 'structured-v2.1';

export type ExtractedSection = { heading: string; text: string; pageNumber?: number; sectionPath: string[]; order: number };
export type ExtractedEntity = { temporaryId: string; canonicalName: string; normalizedName: string; entityType: CanonicalEntityType; aliases: string[]; sectionOrder: number; confidence: number };
export type ExtractedFact = { subjectTemporaryId: string; field: string; value: string | number | boolean | string[]; normalizedValue: string; valueType: CanonicalFactValueType; qualifiers: Record<string, unknown>; sourceText: string; confidence: number; sectionOrder: number };
export type ExtractedRelationship = { subjectTemporaryId: string; relation: string; objectTemporaryId: string; qualifiers: Record<string, unknown>; sourceText: string; confidence: number; sectionOrder: number };
export type StructuredKnowledgeExtraction = {
  sections: ExtractedSection[];
  entities: ExtractedEntity[];
  facts: ExtractedFact[];
  relationships: ExtractedRelationship[];
  debug: { detectedSections: string[]; extractedEntities: string[]; extractedFacts: number; rejectedUncertainFacts: string[]; sourceMapping: Array<{ sectionOrder: number; entityCount: number; factCount: number; relationshipCount: number }> };
};

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const normalizeEntity = (name: string, entityType: CanonicalEntityType) => {
  const normalized = normalize(name);
  const words = normalized.split(' ').filter(Boolean);
  // Person-name word order is not identity; other entity types retain order.
  return entityType === 'person' && words.length >= 2 && words.length <= 3 ? [...words].sort().join(' ') : normalized;
};
const isHeading = (line: string) => /^[A-Z][A-Z\s&/-]{2,100}$/.test(line) || /^(?:education|skills?|projects?|experience|certifications?|contact|about|products?|services?|policies)$/i.test(line);

/** Splits by explicit headings only; paragraphs remain intact for source fidelity. */
export function extractKnowledgeSections(content: string): ExtractedSection[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current = { heading: '', lines: [] as string[] };
  for (const line of lines) {
    if (isHeading(line) && current.lines.length) {
      sections.push(current);
      current = { heading: line, lines: [] };
    } else if (isHeading(line) && !current.lines.length && !current.heading) {
      current.heading = line;
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length || current.heading) sections.push(current);
  return sections.map((section, order) => ({ heading: section.heading, text: section.lines.join('\n').trim(), sectionPath: section.heading ? [section.heading] : [], order })).filter((section) => section.text.length > 0);
}

/**
 * Deterministic, evidence-only extraction. It does not retrieve, route, or
 * generate answers and contains no entity/domain-specific special cases.
 */
export function extractStructuredKnowledge(content: string): StructuredKnowledgeExtraction {
  const sections = extractKnowledgeSections(content);
  const entities: ExtractedEntity[] = [];
  const facts: ExtractedFact[] = [];
  const relationships: ExtractedRelationship[] = [];
  const rejectedUncertainFacts: string[] = [];
  const sourceMapping: StructuredKnowledgeExtraction['debug']['sourceMapping'] = [];
  // A heading split must not lose the document's explicitly declared subject.
  // The context line is derived from the same document, never inferred.
  const firstHeading = sections.find((section) => section.heading)?.heading ?? '';
  // PDF resumes commonly expose the person's all-caps name as a heading rather
  // than a `Name:` field. Require contact/profile evidence too, so ordinary
  // all-caps document titles are not treated as people.
  const inferredPersonName = !/^\s*(?:contact|education|skills?|projects?|experience|certifications?)\s*$/i.test(firstHeading)
    && /^[A-Z][A-Z' -]+$/.test(firstHeading)
    && firstHeading.trim().split(/\s+/).length >= 2
    && firstHeading.trim().split(/\s+/).length <= 3
    && /(?:@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s()-]{8,})/.test(content)
    ? firstHeading.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
    : null;
  const inferredContext = inferredPersonName ? `Name: ${inferredPersonName}\n` : '';
  const documentEntities = extractDeterministicFacts(`${inferredContext}${content}`).entities;
  const primaryEntity = documentEntities.find((entity) => ['person', 'organization', 'project', 'product'].includes(entity.entityType));
  const entityLabel: Record<CanonicalEntityType, string> = { person: 'Name', organization: 'Organization', project: 'Project', product: 'Product', technology: 'Technology', location: 'Location', other: 'Entity' };
  const contextLine = primaryEntity ? `${entityLabel[primaryEntity.entityType]}: ${primaryEntity.name}` : '';

  for (const section of sections) {
    const graph = extractDeterministicFacts([contextLine, section.heading, section.text].filter(Boolean).join('\n'));
    // The deterministic graph extractor may surface a lowercase sentence
    // fragment as a tentative entity. Structured records only keep explicit
    // entity-like names; technologies retain their own recognized casing.
    const credibleEntities = graph.entities.filter((entity) => {
      if (/^(?:\p{Lu}|\d)/u.test(entity.name)) return true;
      // A single-token lowercase technology can be explicit (for example a
      // language/tool name); lowercase multi-word prose is not an entity.
      return entity.entityType === 'technology' && /^[a-z\d.+#-]+$/i.test(entity.name) && !/\s/.test(entity.name);
    });
    const ids = new Set(credibleEntities.map((entity) => entity.temporaryId));
    for (const entity of credibleEntities) entities.push({ temporaryId: entity.temporaryId, canonicalName: entity.name, normalizedName: normalizeEntity(entity.name, entity.entityType), entityType: entity.entityType, aliases: entity.aliases, sectionOrder: section.order, confidence: 0.95 });
    for (const fact of graph.facts) {
      if (!ids.has(fact.subjectTemporaryId) || !fact.supportingText.trim()) { rejectedUncertainFacts.push(`Unsupported fact in section ${section.order}`); continue; }
      facts.push({ subjectTemporaryId: fact.subjectTemporaryId, field: fact.field ?? fact.predicate, value: fact.value, normalizedValue: normalize(Array.isArray(fact.value) ? fact.value.join(' ') : String(fact.value)), valueType: fact.valueType, qualifiers: fact.qualifiers ?? {}, sourceText: fact.supportingText, confidence: fact.confidence, sectionOrder: section.order });
    }
    for (const relationship of graph.relationships) {
      if (!ids.has(relationship.sourceTemporaryId) || !ids.has(relationship.targetTemporaryId) || !relationship.supportingText.trim()) { rejectedUncertainFacts.push(`Unsupported relationship in section ${section.order}`); continue; }
      relationships.push({ subjectTemporaryId: relationship.sourceTemporaryId, relation: relationship.relationshipType, objectTemporaryId: relationship.targetTemporaryId, qualifiers: {}, sourceText: relationship.supportingText, confidence: relationship.confidence, sectionOrder: section.order });
    }
    sourceMapping.push({ sectionOrder: section.order, entityCount: credibleEntities.length, factCount: facts.filter((fact) => fact.sectionOrder === section.order).length, relationshipCount: relationships.filter((relationship) => relationship.sectionOrder === section.order).length });
  }
  const unique = <T>(items: T[], key: (item: T) => string) => [...new Map(items.map((item) => [key(item), item])).values()];
  const uniqueEntities = unique(entities, (entity) => `${entity.entityType}:${entity.normalizedName}`);
  return {
    sections,
    entities: uniqueEntities,
    facts: unique(facts, (fact) => `${fact.subjectTemporaryId}:${fact.field}:${fact.normalizedValue}:${fact.sectionOrder}`),
    relationships: unique(relationships, (relationship) => `${relationship.subjectTemporaryId}:${relationship.relation}:${relationship.objectTemporaryId}:${relationship.sectionOrder}`),
    debug: { detectedSections: sections.map((section) => section.heading).filter(Boolean), extractedEntities: uniqueEntities.map((entity) => entity.canonicalName), extractedFacts: facts.length, rejectedUncertainFacts, sourceMapping },
  };
}
