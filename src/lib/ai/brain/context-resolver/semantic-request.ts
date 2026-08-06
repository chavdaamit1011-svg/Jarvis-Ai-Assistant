import { normalizeQuery } from '@/lib/ai/query-understanding/normalize-query';
import { normalizeRequestedField } from '@/lib/ai/query-understanding/field-normalization';

export function semanticRequest(query: string) {
  const normalized = normalizeQuery(query); const fields = normalizeRequestedField(normalized).requestedFields.filter((field) => field !== 'unknown');
  return { informationNeed: fields[0] ?? 'general_information', requestedAttributes: fields };
}
