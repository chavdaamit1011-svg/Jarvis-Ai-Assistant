import { extractEntities } from '@/lib/ai/rag/entity-extraction';

export type ExtractedFact = { field: string; value: string; normalizedValue: string; confidence: number };

const TECH_NAMES: Array<[RegExp, string]> = [
  [/java\s*script/i, 'JavaScript'], [/type\s*script/i, 'TypeScript'], [/next\s*\.?\s*js/i, 'Next.js'],
  [/react\s*\.?\s*js/i, 'React.js'], [/node\s*\.?\s*js/i, 'Node.js'], [/express\s*\.?\s*js/i, 'Express.js'],
  [/mongo\s*db/i, 'MongoDB'], [/tailwind\s*css/i, 'Tailwind CSS'], [/bootstrap/i, 'Bootstrap'],
  [/\bhtml\b/i, 'HTML'], [/\bcss\b/i, 'CSS'], [/\bphp\b/i, 'PHP'], [/\bai\b/i, 'AI'],
  [/\brag\b/i, 'RAG'], [/embeddings?/i, 'Embeddings'], [/tool\s*calling/i, 'Tool Calling'],
];

export const normalizeFactValue = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ' ').replace(/\s+/g, ' ').trim();

function unique(facts: ExtractedFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => { const key = `${fact.field}:${fact.normalizedValue}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

export function extractFacts(content: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const add = (field: string, value: string, confidence = 0.9) => {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (clean) facts.push({ field, value: clean, normalizedValue: normalizeFactValue(clean), confidence });
  };

  for (const match of content.matchAll(/\b(?:is|are|as)\s+(?:an?\s+)?([a-z\s-]{3,60}(?:developer|engineer|designer|manager|consultant))/gi)) add('profession', match[1], 0.82);
  for (const match of content.matchAll(/(?:role|position|title)\s*:\s*([^\n]+)/gi)) add('role', match[1], 0.95);
  for (const match of content.matchAll(/\b(?:owner|founder|creator)\s+of\s+([A-Za-z0-9 ._-]{2,100})/gi)) add('ownerOf', match[1].replace(/[.,;]+$/, ''), 0.96);
  for (const match of content.matchAll(/(?:education|degree|university|college)\s*:\s*([^\n]+)/gi)) add('education', match[1], 0.9);
  for (const match of content.matchAll(/(?:project|project work)\s*:\s*([^\n]+)/gi)) add('projects', match[1], 0.85);

  for (const [pattern, name] of TECH_NAMES) if (pattern.test(content)) add('technologies', name, 0.93);
  const entities = extractEntities(content);
  for (const email of entities.emails) add('email', email, 0.99);
  for (const phone of entities.phoneNumbers) if (phone.replace(/\D/g, '').length >= 10) add('phone', phone, 0.99);
  for (const url of entities.linkedinUrls) add('linkedinUrl', url, 0.99);
  for (const url of entities.githubUrls) add('githubUrl', url, 0.99);
  for (const url of entities.portfolioUrls) add('portfolioUrl', url, 0.99);
  return unique(facts);
}
