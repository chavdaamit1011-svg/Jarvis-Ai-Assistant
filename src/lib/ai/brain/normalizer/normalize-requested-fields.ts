import { normalizeRequestedField } from '@/lib/ai/query-understanding/field-normalization';

export function normalizeRequestedFields(query: string) {
  const detected = normalizeRequestedField(query);
  return detected.requestedFields.filter((field) => {
    if (field !== 'projects') return field !== 'unknown';
    // "work" alone is a general verb (for example, "how does X work?").
    // Project intent needs an explicit project/build/product signal.
    return /\b(?:projects?|built|created|applications?|products?|banaya|banavelu)\b/i.test(query);
  });
}
