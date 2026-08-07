import { detectQueryLanguage } from '../normalizer';
import { normalizeEntityMentions } from '../normalizer';
import { contextResolutionSchema } from './context-schema';
import { activeContextEntities, resolveReferences } from './reference-resolver';
import { semanticRequest } from './semantic-request';
import type { ContextResolverInput, ContextResolution } from './context-types';

function clarification(language: string) { return /hinglish|hindi|gujarati/i.test(language) ? 'Kripya clear batayein ki kis person ya entity ke baare mein pooch rahe hain.' : 'Please specify which person or entity you mean.'; }

export function resolveConversationContext(input: ContextResolverInput): ContextResolution {
  const language = detectQueryLanguage(input.currentQuery);
  const currentMentions = normalizeEntityMentions(input.currentQuery, input.currentQuery);
  const candidates = activeContextEntities({ activeEntities: input.activeEntities, previousEntities: input.previousPlan?.entities });
  const references = resolveReferences(input.currentQuery, candidates);
  const semantic = semanticRequest(input.currentQuery);
  const referenceTerms = new Set(references.references.map((value) => value.toLowerCase()));
  const directEntities = currentMentions.filter((mention) => !referenceTerms.has(mention.normalized)).map((mention) => candidates.find((entity) => entity.name.toLowerCase() === mention.original.toLowerCase()) ?? { type: 'unknown', name: mention.original });
  const referencedEntities = directEntities.length ? directEntities : references.resolved.flatMap((reference) => reference.entity ? [reference.entity] : []);
  // Some follow-ups omit both the name and a pronoun (for example,
  // "currently studying?" or "which city?"). Reuse one active entity only
  // when semantic normalization found a profile attribute. Generic topics
  // remain independent and never inherit the active subject.
  const implicitActiveEntity = !directEntities.length && !references.references.length && candidates.length === 1 && semantic.requestedAttributes.length > 0 ? candidates : [];
  const resolvedEntities = referencedEntities.length ? referencedEntities : implicitActiveEntity;
  const requiresClarification = references.ambiguous || references.unresolved;
  const dependency = references.references.length ? ['resolved_reference_from_active_context'] : implicitActiveEntity.length ? ['active_entity_context'] : [];
  const standaloneQuery = resolvedEntities.length && (references.references.length || implicitActiveEntity.length) ? `${resolvedEntities[0].name} ${input.currentQuery}` : input.currentQuery;
  const confidence = requiresClarification ? 0.3 : resolvedEntities.length ? 0.93 : currentMentions.length ? 0.78 : 0.65;
  return contextResolutionSchema.parse({ standaloneQuery, referencedEntities: resolvedEntities, resolvedReferences: references.resolved, informationNeed: semantic.informationNeed, requestedAttributes: semantic.requestedAttributes, conversationDependencies: dependency, requiresClarification, clarificationQuestion: requiresClarification ? clarification(language.responseLanguage) : null, confidence, responseLanguage: language.responseLanguage }) as ContextResolution;
}
