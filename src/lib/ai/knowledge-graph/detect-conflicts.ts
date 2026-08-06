import 'server-only';

import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';

const SINGLE_VALUE_PREDICATES = new Set(['role', 'profession', 'experience', 'owner_of', 'ownerOf']);

export type GraphConflict = { predicate: string; values: unknown[]; factIds: string[] };

export async function detectConflicts(entityId: string, graphVersion?: string): Promise<GraphConflict[]> {
  const facts = await KnowledgeFact.find({ entityId, ...(graphVersion ? { graphVersion } : {}) }).lean();
  const groups = new Map<string, typeof facts>();
  for (const fact of facts) groups.set(fact.predicate, [...(groups.get(fact.predicate) ?? []), fact]);
  const conflicts: GraphConflict[] = [];
  for (const [predicate, values] of groups) {
    if (!SINGLE_VALUE_PREDICATES.has(predicate)) continue;
    const uniqueValues = [...new Map(values.map((fact) => [fact.normalizedValue, fact.value])).values()];
    const isConflicting = uniqueValues.length > 1;
    await KnowledgeFact.updateMany({ _id: { $in: values.map((fact) => fact._id) } }, { $set: { isConflicting } });
    if (isConflicting) conflicts.push({ predicate, values: uniqueValues, factIds: values.map((fact) => String(fact._id)) });
  }
  const hasConflict = conflicts.length > 0;
  await KnowledgeEntity.updateOne({ _id: entityId }, { $set: { status: hasConflict ? 'conflicted' : 'active' } });
  if (hasConflict) await KnowledgeRelationship.updateMany({ sourceEntityId: entityId }, { $set: { isConflicting: false } });
  return conflicts;
}
