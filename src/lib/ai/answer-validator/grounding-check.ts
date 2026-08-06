import type { Evidence } from '@/lib/ai/evidence-builder';

const BOILERPLATE = /^(?:uploaded knowledge|knowledge base|information (?:is )?not available|supported .* information|[-•\s]+)$/i;
const PROJECT_WORDS = /\b(?:project|microservice|mobile app|application|website|store|built|created|developed)\b/i;

function normalized(value: string) { return value.toLowerCase().replace(/https?:\/\//g, '').replace(/[^\p{L}\p{N}.:/-]+/gu, ' ').replace(/\s+/g, ' ').trim(); }
function terms(value: string) { return normalized(value).split(' ').filter((term) => term.length > 2 && !/^(the|and|with|from|this|that|for|are|was|has|have|was|hai|hain)$/.test(term)); }

function supported(claim: string, evidence: Evidence) {
  const target = normalized(claim);
  if (!target || BOILERPLATE.test(claim)) return true;
  const values = [...evidence.facts, ...evidence.urls];
  return values.some((fact) => {
    const source = normalized(fact);
    if (source.includes(target) || target.includes(source)) return true;
    const claimTerms = terms(claim); const factTerms = new Set(terms(fact));
    return claimTerms.length > 0 && claimTerms.every((term) => factTerms.has(term));
  });
}

export function answerClaims(text: string) {
  return text.split(/\n|(?<=[.!?])\s+/).map((line) => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
}

export function findUnsupportedClaims(text: string, evidence: Evidence) {
  return answerClaims(text).filter((claim) => !supported(claim, evidence));
}

export function hasSkillsAsProjectClaim(text: string, evidence: Evidence) {
  const claims = answerClaims(text).filter((claim) => PROJECT_WORDS.test(claim));
  return claims.some((claim) => !evidence.facts.some((fact) => normalized(fact).includes(normalized(claim)) || normalized(claim).includes(normalized(fact))));
}

export function hasDuplicateClaims(text: string) {
  const claims = answerClaims(text).map(normalized).filter(Boolean);
  return new Set(claims).size !== claims.length;
}
