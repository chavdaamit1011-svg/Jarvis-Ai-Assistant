import type { QueryUnderstanding } from '@/lib/ai/query-understanding';
import type { AmbiguityResult } from './clarification-types';

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const LINK_PATTERN = /\b(?:link|links|url|profile|account|website|web site)\b/i;
const CONTACT_PATTERN = /\b(?:contact|details|contact details)\b/i;
const PROJECT_PATTERN = /\b(?:project|projects|app|application)\b/i;
const SPECIFIC_PLATFORM = /\b(?:linkedin|linkdin|lindin|linkdn|github|git hub|gitlab|instagram|facebook|youtube)\b/i;

export function detectAmbiguity(input: { query: string; understanding: QueryUnderstanding; resolvedEntityName: string | null; availableLinkTypes: string[]; ambiguousEntityNames?: string[] }): AmbiguityResult {
  const query = normalize(input.query);
  if (input.ambiguousEntityNames?.length) return { isAmbiguous: true, missingInformation: ['entity'], possibleIntents: ['entity_lookup'], clarificationQuestion: `Kis person ya entity ke baare mein puch rahe hain? ${input.ambiguousEntityNames.join(', ')}` };
  const hasLinkRequest = LINK_PATTERN.test(query);
  const hasContactRequest = CONTACT_PATTERN.test(query);
  const hasProjectRequest = PROJECT_PATTERN.test(query);
  const hasEntity = Boolean(input.resolvedEntityName);
  const missingInformation: string[] = [];
  const possibleIntents: string[] = [];

  if (hasLinkRequest) {
    if (!hasEntity) missingInformation.push('entity/person');
    if (!SPECIFIC_PLATFORM.test(query) && input.availableLinkTypes.length !== 1) missingInformation.push('link type');
    possibleIntents.push('linkedin_url', 'github_url', 'portfolio_url', 'website_url');
  } else if (hasContactRequest) {
    if (!hasEntity) missingInformation.push('entity/person');
    if (!/\b(?:email|mail|phone|mobile|number)\b/i.test(query)) missingInformation.push('contact type');
    possibleIntents.push('email', 'phone');
  } else if (hasProjectRequest && !hasEntity) {
    missingInformation.push('entity/person or organization');
    possibleIntents.push('projects');
  }

  return { isAmbiguous: missingInformation.length > 0, missingInformation, possibleIntents, clarificationQuestion: null };
}
