import type { GraphEntityCandidate, GraphExtractionPayload, GraphFactCandidate, GraphRelationshipCandidate } from './graph-types';
import { createTemporaryEntityId, normalizeAliases } from './normalize-entity';
import { GRAPH_RELATIONSHIPS } from './ontology';

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s|,;)\]]+/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s()-]{7,}\d/g;
// Known aliases only improve canonical display; generic extraction below is
// not limited to this list and accepts unseen technologies from explicit text.
const CANONICAL_TECHNOLOGY_ALIASES: Array<[RegExp, string]> = [
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
const normalizedFieldName = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * A small canonical vocabulary gives stable field names while unknown, explicit
 * labels remain usable as `custom.<label>`. This is intentionally domain
 * neutral: documents can describe people, policies, products, or services.
 */
function canonicalField(label: string) {
  const key = normalizedFieldName(label);
  if (/^(?:name|full_name|identity)$/.test(key)) return 'identity';
  if (/^(?:role|position|title|designation)$/.test(key)) return 'role';
  if (/^(?:location|address|city|country)$/.test(key)) return 'location';
  if (/^(?:email|e_mail)$/.test(key)) return 'email';
  if (/^(?:phone|mobile|telephone|contact_number)$/.test(key)) return 'phone';
  if (/^linkedin(?:_url|_profile|_link)?$/.test(key)) return 'linkedin_url';
  if (/^github(?:_url|_profile|_link)?$/.test(key)) return 'github_url';
  if (/^gitlab(?:_url|_profile|_link)?$/.test(key)) return 'gitlab_url';
  if (/^(?:portfolio|portfolio_url|website|website_url|url)$/.test(key)) return key.startsWith('portfolio') ? 'portfolio_url' : 'website_url';
  if (/^(?:education|degree|qualification|university|college|institute|school)$/.test(key)) return `education.${key}`;
  if (/^(?:certificate|certification|course)$/.test(key)) return 'certification';
  if (/^(?:skill|skills|technology|technologies|tech_stack|tools|languages)$/.test(key)) return 'skill';
  if (/^(?:project|projects|project_work|portfolio_projects)$/.test(key)) return 'project';
  if (/^(?:product|products)$/.test(key)) return 'product';
  if (/^(?:service|services)$/.test(key)) return 'service';
  if (/^(?:policy|policies|refund_policy|privacy_policy|terms)$/.test(key)) return 'policy';
  if (/^(?:date|start_date|end_date|valid_from|valid_until)$/.test(key)) return 'date';
  if (/^(?:id|identifier|customer_id|order_id|policy_id)$/.test(key)) return 'id';
  return key ? `custom.${key}` : 'custom.value';
}

function isMultiValueField(field: string) {
  return ['skill', 'project', 'product', 'service', 'certification'].includes(field);
}

function splitAtomicValues(value: string, field: string) {
  const cleaned = cleanValue(value);
  if (!isMultiValueField(field)) return cleaned ? [cleaned] : [];
  return cleaned.split(/\s*(?:\||;|,|\u2022)\s*/).map(cleanValue).filter((item) => item.length >= 2);
}

function valueTypeForField(field: string, value: string): GraphFactCandidate['valueType'] {
  if (/^(?:https?:\/\/|www\.)/i.test(value) || field.includes('url')) return 'url';
  if (field === 'date' && /\b\d{4}\b|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(value)) return 'date';
  if (field === 'id' && /^[A-Za-z0-9_-]{2,80}$/.test(value)) return 'string';
  return 'string';
}
function splitExplicitTechnologyValues(value: string) {
  return value.replace(/\band\b/gi, ',').split(/[,|;/]/).map((item) => cleanValue(item.replace(/^[-â€¢*\s]+/, '')))
    .filter((item) => item.length >= 2 && item.length <= 80 && !/^(?:skills?|technologies|tech stack|languages?)$/i.test(item));
}
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
  const addFact = (subjectTemporaryId: string, predicate: string, value: string, valueType: GraphFactCandidate['valueType'], confidence: number, supportingText: string, field = predicate, qualifiers?: Record<string, unknown>) => {
    const cleaned = cleanValue(value);
    if (cleaned) facts.push({ subjectTemporaryId, predicate, field, value: cleaned, valueType, confidence, supportingText: supportingText.trim(), qualifiers });
  };
  const addRelationship = (sourceTemporaryId: string, relationshipType: string, targetTemporaryId: string, confidence: number, supportingText: string) => relationships.push({ sourceTemporaryId, relationshipType, targetTemporaryId, confidence, supportingText: supportingText.trim() });

  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let primaryPerson: string | null = null;
  let primarySubject: string | null = null;
  for (const line of lines) {
    const name = line.match(/^(?:name|full name)\s*:\s*([\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){1,2})\s*$/iu)?.[1];
    if (name) { primaryPerson = addEntity('person', name); primarySubject ??= primaryPerson; continue; }
    const organization = line.match(/^(?:organization|company)\s*:\s*(.{2,180})$/i)?.[1];
    if (organization) { primarySubject ??= addEntity('organization', organization); continue; }
    const project = line.match(/^(?:project|product)\s*:\s*(.{2,180})$/i)?.[1];
    if (project) { addEntity('project', project); continue; }
    const role = line.match(/^(?:role|position|title)\s*:\s*(.{2,180})$/i)?.[1];
    if (role && primaryPerson) {
      addFact(primaryPerson, 'role', role, 'string', 0.98, line);
      const owned = role.match(/\b(?:owner|founder|creator)\s+of\s+(.+)/i)?.[1];
      if (owned) addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.ownerOf, addEntity('product', owned), 0.98, line);
    }
    const experience = line.match(/^(?:experience|years? of experience)\s*:\s*(.{1,180})$/i)?.[1];
    if (experience && primaryPerson) addFact(primaryPerson, 'experience', experience, 'string', 0.95, line);
  }

  // Atomic labelled facts. Each list item is retained as an independent fact
  // with its exact source line, allowing exact lookup/counting without losing
  // the original semantic chunks used by RAG.
  let activeSection: string | null = null;
  for (const line of lines) {
    const heading = line.match(/^([A-Za-z][A-Za-z &/-]{2,80})$/)?.[1];
    if (heading && /^[A-Z\s&/-]+$/.test(heading) && !/^(?:NAME|ROLE|TITLE)$/i.test(heading)) {
      activeSection = canonicalField(heading);
      continue;
    }
    const labelled = line.match(/^([A-Za-z][A-Za-z &/-]{1,80})\s*:\s*(.+)$/);
    const label = labelled?.[1] ?? activeSection;
    const rawValue = labelled?.[2] ?? (activeSection ? line : null);
    if (!label || !rawValue || !primarySubject) continue;
    const field = labelled ? canonicalField(label) : activeSection!;
    if (field === 'identity') continue;
    for (const value of splitAtomicValues(rawValue, field)) {
      if (value.length > 500 || /^(?:education|skills?|projects?|contact)$/i.test(value)) continue;
      addFact(primarySubject, field, value, valueTypeForField(field, value), 0.97, line, field, labelled ? { label: labelled[1] } : { section: label });
    }
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
      addRelationship(person, GRAPH_RELATIONSHIPS.ownerOf, addEntity('product', match[2]), 0.96, match[0]);
    }
  }
  const ownerForPrimary = /\b(?:and\s+)?owner\s+of\s+([A-Z][\p{L}\d ._-]{1,100})/iu.exec(content);
  if (primaryPerson && ownerForPrimary) addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.ownerOf, addEntity('product', ownerForPrimary[1]), 0.95, ownerForPrimary[0]);
  const pronounOwner = /\b(?:he|she|they)\s+(?:is\s+)?(?:an?\s+)?owner\s+of\s+([A-Z][\p{L}\d ._-]{1,100})/giu;
  if (primaryPerson) for (const match of content.matchAll(pronounOwner)) addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.ownerOf, addEntity('product', match[1]), 0.93, match[0]);

  // Resume/project-section blocks stay in their original chunk, while each
  // explicitly named block also becomes a graph project with source evidence.
  // Nothing is inferred from a skill list or a technology mention alone.
  let inProjectSection = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^(?:project(?:\s+work)?|projects|portfolio projects)$/i.test(line)) { inProjectSection = true; continue; }
    if (/^[A-Z][A-Z\s&]{4,}$/.test(line) && !/^(?:PROJECT(?:\s+WORK)?|PROJECTS)$/i.test(line)) inProjectSection = false;
    if (!inProjectSection || !primaryPerson) continue;
    const projectMatch = line.match(/^(?:project\s*:\s*)?((?:e-?commerce\s*\([^)]{2,80}\))|(?:[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*){0,5}))$/i);
    const projectName = projectMatch?.[1]?.trim();
    if (!projectName || /^(?:project work|projects?)$/i.test(projectName)) continue;
    const details = lines.slice(index + 1, index + 8).filter((value) => !/^(?:project\s*:\s*)?((?:e-?commerce\s*\([^)]{2,80}\))|(?:[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*){0,5}))$/i.test(value));
    const supportingText = [line, ...details].join('\n');
    const projectId = addEntity('project', projectName);
    addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.workedOn, projectId, 0.98, supportingText);
    const category = projectName.match(/^([^(]+)\(/)?.[1]?.trim();
    if (category) addFact(projectId, 'category', category, 'string', 0.98, line);
    const description = details.find((value) => !URL_PATTERN.test(value));
    if (description) addFact(projectId, 'description', description, 'string', 0.96, supportingText);
    const url = supportingText.match(URL_PATTERN)?.[0];
    if (url) addFact(projectId, 'project_url', cleanValue(url), 'url', 0.99, supportingText);
    for (const [pattern, technology] of CANONICAL_TECHNOLOGY_ALIASES) {
      if (pattern.test(supportingText)) addRelationship(projectId, GRAPH_RELATIONSHIPS.usesTechnology, addEntity('technology', technology), 0.94, supportingText);
    }
  }

  // Generic, explicitly worded employment relation. The subject and company
  // must both appear in the same sentence; no names or company lists are used.
  const employmentPattern = /\b([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,2})\s+is\s+(?:an?\s+)?([A-Za-z][A-Za-z\s-]{2,60}?)\s+at\s+([A-Z][\p{L}\d& ._-]{1,100})/giu;
  for (const match of content.matchAll(employmentPattern)) {
    const person = primaryPerson ?? addEntity('person', match[1]);
    primaryPerson ??= person;
    addFact(person, 'profession', match[2], 'string', 0.94, match[0]);
    addRelationship(person, GRAPH_RELATIONSHIPS.worksAt, addEntity('organization', match[3]), 0.94, match[0]);
  }

  // Generic creation relation for directly stated project/product creation.
  // It intentionally requires an explicit action word and named object.
  const createdPattern = /\b(?:([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,2})\s+)?(?:created|built|developed)\s+(?:the\s+)?([A-Z][\p{L}\d_-]*(?:\s+[A-Za-z0-9][\p{L}\d _-]{0,80})?)(?:\s+(?:mobile\s+)?(?:application|app|project|product))?/giu;
  for (const match of content.matchAll(createdPattern)) {
    const person = match[1] ? addEntity('person', match[1]) : primaryPerson;
    if (!person) continue;
    primaryPerson ??= person;
    const projectName = cleanValue(match[2]).replace(/\s+(?:mobile\s+)?(?:application|app|project|product)$/i, '').trim();
    if (projectName.length < 2) continue;
    addRelationship(person, GRAPH_RELATIONSHIPS.created, addEntity('project', projectName), 0.92, match[0]);
  }

  if (primaryPerson) {
    for (const [pattern, technology] of CANONICAL_TECHNOLOGY_ALIASES) {
      if (!pattern.test(content)) continue;
      const technologyId = addEntity('technology', technology);
      const supportingText = lines.find((line) => pattern.test(line)) ?? technology;
      if (/\b(?:may|might|possibly|perhaps|unclear|unknown)\b/i.test(supportingText)) continue;
      addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.usesTechnology, technologyId, 0.94, supportingText);
    }
    // Supports previously unseen technologies when a document explicitly labels
    // them as skills/technologies or says the person works with them.
    for (const line of lines) {
      const explicit = line.match(/(?:skills?|technologies|tech(?:nology)? stack|works? with)\s*[:\-]?\s*(.+)$/i)?.[1];
      if (!explicit) continue;
      for (const technology of splitExplicitTechnologyValues(explicit)) {
        addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.usesTechnology, addEntity('technology', technology), 0.9, line);
      }
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
