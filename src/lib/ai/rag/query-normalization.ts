const FILLER_WORDS = new Set(['ni', 'ki', 'ke', 'ka', 'su', 'shu', 'ch', 'che', 'hai', 'he', 'se', 'nu', 'na', 'the', 'is', 'a', 'an', 'what', 'please', 'vailable', 'badhi', 'aap', 'aapo', 'where', 'did', 'does', 'do', 'has', 'have', 'tell', 'me', 'about', 'his', 'her', 'their', 'its', 'kya', 'kon', 'kaun', 'batao', 'aap']);
const CONCEPT_ALIASES: Array<{ terms: string[]; aliases: string[] }> = [
  { terms: ['linkedin', 'link', 'profile', 'url', 'account'], aliases: ['linkedin link', 'linkedin profile', 'linkedin url', 'linkedin account'] },
  { terms: ['owner', 'founder', 'creator', 'built'], aliases: ['owner', 'founder', 'creator', 'built by'] },
];

/**
 * Retrieval-only concepts. These are intentionally generic field concepts,
 * not people, documents, or product-specific aliases. Every variant retains
 * the non-concept part of the user's query so it remains entity-focused.
 */
const RETRIEVAL_CONCEPTS: Array<{ triggers: string[]; terms: string[] }> = [
  {
    triggers: ['education', 'academic', 'qualification', 'qualifications', 'degree', 'college', 'university', 'school', 'study', 'studied', 'studies', 'padhai', 'shiksha', 'bhanelo', 'bhanelu', 'abhyas', 'bhanyo'],
    terms: ['education', 'college', 'university', 'school', 'academic background', 'qualification', 'degree', 'studied'],
  },
  {
    triggers: ['project', 'projects', 'built', 'build', 'created', 'create', 'application', 'applications', 'product', 'products', 'portfolio', 'kaam', 'banaya', 'banavelu'],
    terms: ['projects', 'portfolio', 'work', 'applications', 'software', 'experience'],
  },
  {
    triggers: ['portfolio', 'website', 'site', 'web', 'personal', 'github', 'profile'],
    terms: ['portfolio', 'website', 'github', 'profile', 'personal site'],
  },
  {
    triggers: ['skill', 'skills', 'technology', 'technologies', 'tech', 'stack', 'tool', 'tools', 'use', 'uses', 'work'],
    terms: ['skills', 'technologies', 'technical skills', 'tech stack', 'tools'],
  },
  {
    triggers: ['experience', 'experienced', 'career', 'background', 'worked', 'employment'],
    terms: ['experience', 'work experience', 'professional background', 'employment'],
  },
];

export interface ExpandedRetrievalQuery {
  originalQuery: string;
  normalizedQuery: string;
  primaryQuery: string;
  secondaryQueries: string[];
  keywords: string[];
  expandedQueries: string[];
}

export function normalizeAndExpandQuery(originalQuery: string): ExpandedRetrievalQuery {
  const normalizedQuery = originalQuery.toLowerCase().replace(/(?:'s|’s)\b/g, '').replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const terms = normalizedQuery.split(' ').filter(Boolean);
  const meaningful = terms.filter((term) => !FILLER_WORDS.has(term));
  const variants = new Set<string>([originalQuery.trim(), normalizedQuery]);
  const add = (value: string) => { const next = value.replace(/\s+/g, ' ').trim(); if (next) variants.add(next); };

  for (const group of CONCEPT_ALIASES) {
    if (group.terms.some((term) => meaningful.includes(term))) {
      for (const alias of group.aliases) add([...meaningful.filter((term) => !group.terms.includes(term)), alias].join(' '));
    }
  }

  const anchor = meaningful.findIndex((term) => ['linkedin', 'owner', 'founder', 'creator', 'built'].includes(term));
  const possibleName = (anchor >= 2 ? meaningful.slice(Math.max(0, anchor - 2), anchor) : meaningful.slice(0, 2)).filter((term) => term.length > 1);
  if (possibleName.length === 2 || possibleName.length === 3) {
    const reversed = [...possibleName].reverse();
    const remainder = meaningful.filter((term) => !possibleName.includes(term));
    add([...reversed, ...remainder].join(' '));
    for (const group of CONCEPT_ALIASES) if (group.terms.some((term) => remainder.includes(term))) for (const alias of group.aliases) add([...reversed, alias].join(' '));
  }

  // Build field-oriented expansions for embedding search. `entityTerms` is
  // derived from the query itself; no entity database lookup happens here.
  const conceptTerms = new Set(RETRIEVAL_CONCEPTS.flatMap((concept) => concept.triggers));
  const entityTerms = meaningful.filter((term) => !conceptTerms.has(term));
  const entityPrefix = entityTerms.join(' ');
  const detectedConcepts = RETRIEVAL_CONCEPTS.filter((concept) => concept.triggers.some((term) => meaningful.includes(term)));
  const secondaryQueries = new Set<string>();
  for (const concept of detectedConcepts) {
    for (const term of concept.terms) {
      // Keeping the entity/reference words attached avoids retrieving an
      // unrelated education or project chunk from another document.
      secondaryQueries.add([entityPrefix, term].filter(Boolean).join(' ').trim());
    }
  }
  for (const secondaryQuery of secondaryQueries) add(secondaryQuery);

  const expandedQueries = [...variants].slice(0, 20);
  return {
    originalQuery,
    normalizedQuery,
    primaryQuery: originalQuery.trim(),
    secondaryQueries: [...secondaryQueries].filter(Boolean).slice(0, 12),
    keywords: meaningful,
    expandedQueries,
  };
}
