import type { GraphEntityCandidate, GraphExtractionPayload, GraphFactCandidate, GraphRelationshipCandidate } from './graph-types';
import { createTemporaryEntityId, normalizeAliases } from './normalize-entity';

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s|,;)\]]+/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s()-]{7,}\d/g;
const TECHNOLOGIES: Array<[RegExp, string]> = [
  [/\bnext\s*\.?\s*js\b/i, 'Next.js'], [/\breact\s*\.?\s*js\b/i, 'React.js'], [/\bnode\s*\.?\s*js\b/i, 'Node.js'],
  [/\bexpress\s*\.?\s*js\b/i, 'Express.js'], [/\btype\s*script\b/i, 'TypeScript'], [/\bjava\s*script\b/i, 'JavaScript'],
  [/\bmongo\s*db\b/i, 'MongoDB'], [/\btailwind\s*css\b/i, 'Tailwind CSS'], [/\bbootstrap\b/i, 'Bootstrap'],
  [/\bhtml\b/i, 'HTML'], [/\bcss\b/i, 'CSS'], [/\bphp\b/i, 'PHP'], [/\bpython\b/i, 'Python'],
];

function urlPredicate(rawUrl: string) {
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  try {
    const domain = new URL(normalized).hostname.toLowerCase();
    if (domain.includes('linkedin.com')) return 'linkedin_url';
    if (domain.includes('github.com')) return 'github_url';
    if (domain.includes('gitlab.com')) return 'gitlab_url';
    if (domain.includes('instagram.com')) return 'instagram_url';
    if (domain === 'x.com' || domain.endsWith('.x.com') || domain.includes('twitter.com')) return 'x_url';
    if (domain.includes('youtube.com') || domain === 'youtu.be') return 'youtube_url';
  } catch { /* Unsupported malformed URL is ignored. */ }
  return 'website_url';
}

function cleanValue(value: string) { return value.replace(/[.,;]+$/, '').replace(/\s+/g, ' ').trim(); }
/** Extracts only facts directly expressed in a chunk; it never guesses subjects or values. */
export function extractDeterministicFacts(content: string): GraphExtractionPayload {
  const entities = new Map<string, GraphEntityCandidate>();
  const facts: GraphFactCandidate[] = [];
  const relationships: GraphRelationshipCandidate[] = [];
  const addEntity = (entityType: GraphEntityCandidate['entityType'], name: string, aliases: string[] = []) => {
    const cleaned = cleanValue(name);
    const temporaryId = createTemporaryEntityId(entityType, cleaned);
    const existing = entities.get(temporaryId);
    entities.set(temporaryId, existing ? { ...existing, aliases: normalizeAliases(cleaned, [...existing.aliases, ...aliases]) } : { temporaryId, entityType, name: cleaned, aliases: normalizeAliases(cleaned, aliases) });
    return temporaryId;
  };
  const addFact = (subjectTemporaryId: string, predicate: string, value: string, valueType: GraphFactCandidate['valueType'], confidence: number, supportingText: string) => {
    const cleaned = cleanValue(value);
    if (cleaned) facts.push({ subjectTemporaryId, predicate, value: cleaned, valueType, confidence, supportingText: supportingText.trim() });
  };
  const addRelationship = (sourceTemporaryId: string, relationshipType: string, targetTemporaryId: string, confidence: number, supportingText: string) => relationships.push({ sourceTemporaryId, relationshipType, targetTemporaryId, confidence, supportingText: supportingText.trim() });

  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let primaryPerson: string | null = null;
  for (const line of lines) {
    const name = line.match(/^(?:name|full name)\s*:\s*([\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){1,2})\s*$/iu)?.[1];
    if (name) { primaryPerson = addEntity('person', name); continue; }
    const organization = line.match(/^(?:organization|company)\s*:\s*(.{2,180})$/i)?.[1];
    if (organization) { addEntity('organization', organization); continue; }
    const project = line.match(/^(?:project|product)\s*:\s*(.{2,180})$/i)?.[1];
    if (project) { addEntity('project', project); continue; }
    const role = line.match(/^(?:role|position|title)\s*:\s*(.{2,180})$/i)?.[1];
    if (role && primaryPerson) {
      addFact(primaryPerson, 'role', role, 'string', 0.98, line);
      const owned = role.match(/\b(?:owner|founder|creator)\s+of\s+(.+)/i)?.[1];
      if (owned) addRelationship(primaryPerson, 'OWNER_OF', addEntity('product', owned), 0.98, line);
    }
    const experience = line.match(/^(?:experience|years? of experience)\s*:\s*(.{1,180})$/i)?.[1];
    if (experience && primaryPerson) addFact(primaryPerson, 'experience', experience, 'string', 0.95, line);
  }

  const proseMatch = content.match(/\b([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,2})\s+is\s+(?:an?\s+)?([A-Za-z][A-Za-z\s-]{2,60}?(?:developer|engineer|designer|manager|consultant))\b/iu);
  if (proseMatch) {
    primaryPerson ??= addEntity('person', proseMatch[1]);
    addFact(primaryPerson, 'profession', proseMatch[2], 'string', 0.9, proseMatch[0]);
  }
  const ownerPattern = /\b([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,2})\s+(?:is\s+)?owner\s+of\s+([A-Z][\p{L}\d ._-]{1,100})/giu;
  if (!primaryPerson) {
    for (const match of content.matchAll(ownerPattern)) {
      const person = addEntity('person', match[1]); primaryPerson ??= person;
      addRelationship(person, 'OWNER_OF', addEntity('product', match[2]), 0.96, match[0]);
    }
  }
  const ownerForPrimary = /\b(?:and\s+)?owner\s+of\s+([A-Z][\p{L}\d ._-]{1,100})/iu.exec(content);
  if (primaryPerson && ownerForPrimary) addRelationship(primaryPerson, 'OWNER_OF', addEntity('product', ownerForPrimary[1]), 0.95, ownerForPrimary[0]);
  const pronounOwner = /\b(?:he|she|they)\s+(?:is\s+)?(?:an?\s+)?owner\s+of\s+([A-Z][\p{L}\d ._-]{1,100})/giu;
  if (primaryPerson) for (const match of content.matchAll(pronounOwner)) addRelationship(primaryPerson, 'OWNER_OF', addEntity('product', match[1]), 0.93, match[0]);

  if (primaryPerson) {
    for (const [pattern, technology] of TECHNOLOGIES) {
      if (!pattern.test(content)) continue;
      const technologyId = addEntity('technology', technology);
      const supportingText = lines.find((line) => pattern.test(line)) ?? technology;
      if (/\b(?:may|might|possibly|perhaps|unclear|unknown)\b/i.test(supportingText)) continue;
      addRelationship(primaryPerson, 'USES_TECHNOLOGY', technologyId, 0.94, supportingText);
    }
    for (const line of lines) {
      for (const url of line.match(URL_PATTERN) ?? []) addFact(primaryPerson, urlPredicate(url), cleanValue(url), 'url', 0.99, line);
      for (const email of line.match(EMAIL_PATTERN) ?? []) addFact(primaryPerson, 'email', email, 'string', 0.99, line);
      for (const phone of line.match(PHONE_PATTERN) ?? []) if (phone.replace(/\D/g, '').length >= 10) addFact(primaryPerson, 'phone', cleanValue(phone), 'string', 0.99, line);
    }
  }

  const dedupe = <T extends { [key: string]: unknown }>(values: T[], key: (value: T) => string) => [...new Map(values.map((value) => [key(value), value])).values()];
  return {
    entities: [...entities.values()],
    facts: dedupe(facts, (fact) => `${fact.subjectTemporaryId}:${fact.predicate}:${String(fact.value).toLowerCase()}`),
    relationships: dedupe(relationships, (relationship) => `${relationship.sourceTemporaryId}:${relationship.relationshipType}:${relationship.targetTemporaryId}`),
  };
}
