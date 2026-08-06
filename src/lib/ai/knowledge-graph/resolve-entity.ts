import 'server-only';

import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeEntityResolution from '@/models/KnowledgeEntityResolution';
import type { GraphEntityCandidate } from './graph-types';
import { normalizeAliases, normalizeEntityName } from './normalize-entity';

export type EntityResolutionOutcome = 'matched' | 'new_entity' | 'ambiguous' | 'conflicting';
export type EntityIdentityEvidence = { predicate: 'email' | 'linkedin_url' | 'github_url' | 'gitlab_url' | 'instagram_url' | 'x_url' | 'youtube_url' | 'website_url'; value: string };
export type EntityResolutionResult = { outcome: EntityResolutionOutcome; entityId: string | null; candidateEntityIds: string[]; reason: string };

const PROFILE_PREDICATES = new Set<EntityIdentityEvidence['predicate']>(['email', 'linkedin_url', 'github_url', 'gitlab_url', 'instagram_url', 'x_url', 'youtube_url']);
const reverseName = (value: string) => value.split(' ').filter(Boolean).reverse().join(' ');

export async function resolveEntity(candidate: GraphEntityCandidate, options: { identityEvidence?: EntityIdentityEvidence[]; documentId: string; chunkId: string; graphVersion?: string }): Promise<EntityResolutionResult> {
  const normalizedName = normalizeEntityName(candidate.name);
  const aliases = normalizeAliases(candidate.name, candidate.aliases).map(normalizeEntityName);
  const reversed = reverseName(normalizedName);
  const all = await KnowledgeEntity.find({ entityType: candidate.entityType, status: { $ne: 'archived' } }).lean();
  const exactNameMatches = all.filter((entity) => {
    const storedAliases = (entity.aliases ?? []).map(normalizeEntityName);
    return entity.normalizedName === normalizedName || entity.normalizedName === reversed || storedAliases.some((alias) => aliases.includes(alias) || alias === normalizedName || alias === reversed);
  });
  const contextMatches = exactNameMatches.filter((entity) => (entity.sourceDocumentIds ?? []).some((documentId) => String(documentId) === options.documentId));

  const evidenceValues = (options.identityEvidence ?? []).filter((evidence) => PROFILE_PREDICATES.has(evidence.predicate)).map((evidence) => normalizeEntityName(evidence.value));
  const evidenceMatches = evidenceValues.length
    ? await KnowledgeFact.find({ predicate: { $in: [...PROFILE_PREDICATES] }, normalizedValue: { $in: evidenceValues } }).select('entityId').lean()
    : [];
  const evidenceEntityIds = new Set(evidenceMatches.map((fact) => String(fact.entityId)));
  const strongMatches = all.filter((entity) => evidenceEntityIds.has(String(entity._id)));
  const candidateIds = [...new Set([...exactNameMatches, ...strongMatches, ...contextMatches].map((entity) => String(entity._id)))];
  const firstNameOnly = normalizedName.split(' ').length === 1;

  let outcome: EntityResolutionOutcome = 'new_entity';
  let entityId: string | null = null;
  let reason = 'No exact name, alias, email, or profile URL match was found.';
  if (strongMatches.length === 1) {
    outcome = 'matched'; entityId = String(strongMatches[0]._id); reason = 'Matched by exact email or profile URL evidence.';
  } else if (strongMatches.length > 1) {
    outcome = 'conflicting'; reason = 'The supplied email or profile URL maps to more than one stored entity.';
  } else if (!firstNameOnly && exactNameMatches.length === 1) {
    outcome = 'matched'; entityId = String(exactNameMatches[0]._id); reason = 'Matched by normalized name, reversed name, or explicit alias.';
  } else if (!firstNameOnly && contextMatches.length === 1) {
    outcome = 'matched'; entityId = String(contextMatches[0]._id); reason = 'Matched by exact name/alias plus supporting document context.';
  } else if (exactNameMatches.length > 0 || (firstNameOnly && all.some((entity) => entity.normalizedName.split(' ').includes(normalizedName)))) {
    outcome = 'ambiguous'; reason = 'First-name-only or multiple candidate matches require review; no automatic merge was performed.';
  }

  if (outcome === 'ambiguous' || outcome === 'conflicting') {
    await KnowledgeEntityResolution.create({ entityType: candidate.entityType, incomingName: candidate.name, normalizedName, graphVersion: options.graphVersion, outcome, candidateEntityIds: candidateIds, documentId: options.documentId, chunkId: options.chunkId, reason });
    if (process.env.NODE_ENV !== 'production') console.warn('[knowledge-graph] entity resolution needs review', { outcome, incomingName: candidate.name, candidateEntityIds: candidateIds });
  }
  return { outcome, entityId, candidateEntityIds: candidateIds, reason };
}
