import { queryUnderstandingSchema } from './schema';
import { normalizeQuery } from './normalize-query';
import type { QueryUnderstanding } from './types';
import { classifyLinkRequest } from '@/lib/ai/link-resolution';
import { normalizeRequestedField } from './field-normalization';

type RequestedField = QueryUnderstanding['requestedField'];
type Platform = QueryUnderstanding['platform'];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'answer', 'app', 'batao', 'bhej', 'bhejo', 'by', 'ch', 'che', 'contact',
  'do', 'education', 'email', 'explain', 'facebook', 'for', 'founder', 'git', 'github', 'gitlab', 'give', 'hai', 'hain', 'he', 'hub', 'in', 'instagram', 'is', 'ka',
  'ke', 'ki', 'kis', 'kya', 'link', 'linkdin', 'linkedin', 'lindin', 'linkdn',
  'ni', 'no', 'of', 'on', 'owner', 'phone', 'portfolio', 'profile', 'project', 'projects', 'role',
  'show', 'send', 'skill', 'skills', 'summary', 'su', 'shu', 'the', 'to', 'twitter', 'url', 'what', 'youtube',
  'who', 'with', 'website', 'web', 'your', 'karo',
]);

const LINKEDIN_TERMS = ['linkedin', 'linked', 'linkdin', 'lindin', 'linkdn', 'linkedn'];
const GITHUB_TERMS = ['github', 'git', 'gitub', 'githb'];
const PORTFOLIO_TERMS = ['portfolio', 'personalpage'];
const WEBSITE_TERMS = ['website', 'web', 'site', 'webpage'];
const PROFILE_TERMS = ['profile', 'proflie', 'ptofile', 'profle', 'profil', 'account', 'url', 'link'];

function editDistance(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  return matrix[left.length][right.length];
}

function matchesTerm(term: string, aliases: string[]) {
  return aliases.some((alias) => term === alias || (term.length >= 5 && editDistance(term, alias) <= 2));
}

function titleCase(value: string) {
  return value.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
}

function detectEntityName(terms: string) {
  const candidates = terms
    .split(' ')
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term) && !matchesTerm(term, PROFILE_TERMS));

  if (!candidates.length) return null;
  // Profile/contact requests normally name a person using one to three words.
  return titleCase(candidates.slice(-3).join(' '));
}

function fieldFromQuery(normalized: string): { field: RequestedField; platform: Platform; confidence: number } {
  const canonical=normalizeRequestedField(normalized); const selected=canonical.requestedFields[0];
  if(selected==='education'||selected==='projects'||selected==='skills')return{field:selected,platform:'unknown',confidence:canonical.confidence};
  const terms = normalized.split(' ').filter(Boolean);
  const hasLinkedIn = terms.some((term) => matchesTerm(term, LINKEDIN_TERMS));
  const hasGitHub = terms.some((term) => matchesTerm(term, GITHUB_TERMS));
  const hasPortfolio = terms.some((term) => matchesTerm(term, PORTFOLIO_TERMS));
  const hasWebsite = terms.some((term) => matchesTerm(term, WEBSITE_TERMS));
  const hasProfileWord = terms.some((term) => matchesTerm(term, PROFILE_TERMS));

  if (hasLinkedIn) return { field: 'linkedin_url', platform: 'linkedin', confidence: hasProfileWord ? 0.98 : 0.9 };
  if (hasGitHub) return { field: 'github_url', platform: 'github', confidence: hasProfileWord ? 0.98 : 0.9 };
  if (hasPortfolio) return { field: 'portfolio_url', platform: 'portfolio', confidence: 0.95 };
  if (hasWebsite) return { field: 'website_url', platform: 'website', confidence: 0.88 };
  if (/\b(?:email|e mail|mail id)\b/.test(normalized)) return { field: 'email', platform: 'unknown', confidence: 0.95 };
  if (/\b(?:phone|mobile|number|contact)\b/.test(normalized)) return { field: 'phone', platform: 'unknown', confidence: 0.92 };
  if (/\b(?:owner|own|owns|founder|creator|built by|banaya|banaya hai)\b/.test(normalized)) return { field: 'owner', platform: 'unknown', confidence: 0.9 };
  if (/\b(?:role|designation|position|job title)\b/.test(normalized)) return { field: 'role', platform: 'unknown', confidence: 0.9 };
  if (/\b(?:skills?|technology|technologies|tech|tech stack)\b/.test(normalized)) return { field: 'skills', platform: 'unknown', confidence: 0.9 };
  if (/\b(?:education|study|college|university|degree)\b/.test(normalized)) return { field: 'education', platform: 'unknown', confidence: 0.9 };
  if (/\b(?:projects?|project work|application|software)\b/.test(normalized)) return { field: 'projects', platform: 'unknown', confidence: 0.88 };
  if (/\b(?:summary|about|introduce|introduction)\b/.test(normalized)) return { field: 'summary', platform: 'unknown', confidence: 0.82 };
  return { field: 'unknown', platform: 'unknown', confidence: 0.25 };
}

/**
 * Cheap, deterministic query-understanding fallback. Its output is validated
 * before it is allowed to influence retrieval. A hosted classifier can replace
 * this function later without changing callers.
 */
export function parseQueryDeterministically(query: string): QueryUnderstanding {
  const normalizedQuery = normalizeQuery(query);
  const detected = fieldFromQuery(normalizedQuery);
  const detectedEntityName = detectEntityName(normalizedQuery);
  const linkRequest = classifyLinkRequest(query, detectedEntityName);
  const isExact = ['linkedin_url', 'github_url', 'portfolio_url', 'website_url', 'email', 'phone', 'owner', 'role'].includes(detected.field);
  const isDescriptive = ['skills', 'education', 'projects', 'summary'].includes(detected.field);
  const result: QueryUnderstanding = {
    intent: isExact ? 'exact_value_lookup' : isDescriptive ? 'descriptive_question' : 'general_question',
    entityType: detectedEntityName ? 'person' : 'unknown',
    entityName: detectedEntityName,
    requestedField: detected.field,
    platform: detected.platform,
    language: 'und',
    confidence: detected.confidence,
    normalizedQuery,
    linkRequestType: linkRequest?.linkRequestType ?? null,
    isAmbiguous: false,
    missingInformation: [],
    possibleIntents: [],
    clarificationQuestion: null,
  };

  return queryUnderstandingSchema.parse(result);
}
