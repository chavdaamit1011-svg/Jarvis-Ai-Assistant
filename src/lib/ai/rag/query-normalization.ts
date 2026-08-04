const FILLER_WORDS = new Set(['ni', 'ki', 'ke', 'ka', 'su', 'shu', 'ch', 'che', 'hai', 'he', 'se', 'nu', 'na', 'the', 'is', 'a', 'an', 'what', 'please', 'vailable', 'badhi', 'aap', 'aapo']);
const CONCEPT_ALIASES: Array<{ terms: string[]; aliases: string[] }> = [
  { terms: ['linkedin', 'link', 'profile', 'url', 'account'], aliases: ['linkedin link', 'linkedin profile', 'linkedin url', 'linkedin account'] },
  { terms: ['owner', 'founder', 'creator', 'built'], aliases: ['owner', 'founder', 'creator', 'built by'] },
];

export interface ExpandedRetrievalQuery { originalQuery: string; normalizedQuery: string; expandedQueries: string[]; }

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
  return { originalQuery, normalizedQuery, expandedQueries: [...variants].slice(0, 12) };
}
