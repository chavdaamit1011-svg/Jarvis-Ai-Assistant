import type { QueryUnderstanding } from '@/lib/ai/query-understanding';

export const EXACT_VALUE_FIELDS = new Set<QueryUnderstanding['requestedField']>([
  'linkedin_url', 'github_url', 'portfolio_url', 'website_url', 'email', 'phone', 'owner', 'role',
]);

export const DOCUMENT_DESCRIPTIVE_FIELDS = new Set<QueryUnderstanding['requestedField']>([
  'skills', 'education', 'projects', 'summary',
]);

// English plus common Hindi/Hinglish/Gujarati-Roman ways of asking for a
// changing, time-sensitive fact. These are retrieval-routing hints, not facts.
const CURRENT_INFORMATION_PATTERN = /\b(?:current|currently|latest|newest|recent|today|now|present|live|news|update|current price|current version|current minister|current ceo|released recently|when was the latest update|minister|prime minister|president|ceo|election|price|weather|score|law|policy|abhi|aaj|vartman|vartamaan|haal me|haal ma|haal|hal|abhi ka|naya update|new update|kab aaya|sabse naya|atyare|aaje|navu update|latest su che|kyare aavyu)\b/i;

export function requiresCurrentInformation(query: string) {
  return CURRENT_INFORMATION_PATTERN.test(query);
}

/** Broad questions need strong evidence before a personal document overrides Groq. */
export const GENERAL_QUESTION_RAG_CONFIDENCE = 0.45;
