import type { QueryUnderstanding } from '@/lib/ai/query-understanding';

export const EXACT_VALUE_FIELDS = new Set<QueryUnderstanding['requestedField']>([
  'linkedin_url', 'github_url', 'portfolio_url', 'website_url', 'email', 'phone', 'owner', 'role',
]);

export const DOCUMENT_DESCRIPTIVE_FIELDS = new Set<QueryUnderstanding['requestedField']>([
  'skills', 'education', 'projects', 'summary',
]);

// English plus common Hindi/Hinglish/Gujarati-Roman ways of asking for a
// changing, time-sensitive fact. These are retrieval-routing hints, not facts.
const CURRENT_INFORMATION_PATTERN = /\b(?:current|currently|latest|recent|today|now|present|live|news|minister|prime minister|president|ceo|election|price|weather|score|law|policy|abhi|aaj|vartman|vartamaan|haal|hal|nava|navi|naye)\b/i;

export function requiresCurrentInformation(query: string) {
  return CURRENT_INFORMATION_PATTERN.test(query);
}

/** Broad questions need strong evidence before a personal document overrides Groq. */
export const GENERAL_QUESTION_RAG_CONFIDENCE = 0.45;
