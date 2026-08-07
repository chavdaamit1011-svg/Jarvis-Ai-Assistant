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
  [/(?:^|[\s,|])JS(?=$|[\s,.;|])/ , 'JavaScript'],
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

function isProjectTitle(value: string) {
  const candidate = value.replace(/^project\s*:\s*/i, '').trim();
  if (/^(?:project work|projects?)$/i.test(candidate) || candidate.length < 2 || candidate.length > 100) return false;
  if (/^e-?commerce\s*\([^)]{2,80}\)$/i.test(candidate)) return true;
  if (/[.!?]|(?:https?:\/\/|www\.)/i.test(candidate)) return false;
  if (/\b(?:built|created|developed|using|with|added|featuring|link|login|wishlist|integration|management|architecture)\b/i.test(candidate)) return false;
  return /^[A-Z][\w.-]*(?:\s+[A-Z][\w.-]*){0,5}$/.test(candidate);
}

function degreeAlias(degree: string) {
  const normalized = cleanValue(degree).toLowerCase().replace(/aplication/g, 'application');
  if (/^master\s+of\s+computer\s+application$/.test(normalized)) return 'MCA';
  if (/^bachelor\s+of\s+commerce$/.test(normalized)) return 'B.Com';
  return null;
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
      const candidateSection = canonicalField(heading);
      // An all-caps name or arbitrary document title is not a field heading.
      activeSection = candidateSection.startsWith('custom.') ? null : candidateSection;
      continue;
    }
    const labelled = line.match(/^([A-Za-z][A-Za-z &/-]{1,80})\s*:\s*(.+)$/);
    const label = labelled?.[1] ?? activeSection;
    const rawValue = labelled?.[2] ?? (activeSection ? line : null);
    if (!label || !rawValue || !primarySubject) continue;
    const field = labelled ? canonicalField(label) : activeSection!;
    // A URL scheme is not a semantic label. URLs are extracted below with their
    // correct platform/website field and exact value preserved.
    if (/^https?$/i.test(normalizedFieldName(label))) continue;
    if (field === 'identity') continue;
    // Project descriptions are parsed as bounded blocks below. Treating each
    // line as an independent project creates fragments such as "Wishlist".
    if (field === 'project' && !labelled) continue;
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
    if (!isProjectTitle(line)) continue;
    const projectName = line.replace(/^project\s*:\s*/i, '').trim();
    let end = index + 1;
    while (end < lines.length && !isProjectTitle(lines[end]) && !/^[A-Z][A-Z\s&]{4,}$/.test(lines[end])) end += 1;
    const details = lines.slice(index + 1, end);
    const supportingText = [line, ...details].join('\n');
    const projectId = addEntity('project', projectName);
    addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.workedOn, projectId, 0.98, supportingText);
    const category = projectName.match(/^([^(]+)\(/)?.[1]?.trim();
    if (category) addFact(projectId, 'category', category, 'string', 0.98, line);
    const description = details
      .filter((value) => !/(?:https?:\/\/|www\.)/i.test(value) && !/^link\s*(?:[|:]|$)/i.test(value))
      .join(' ')
      .trim();
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
  const createdPattern = /\b([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,2})\s+(?:created|built|developed)\s+(?:the\s+)?([A-Z][\p{L}\d_-]*(?:\s+[A-Za-z0-9][\p{L}\d _-]{0,80})?)(?:\s+(?:mobile\s+)?(?:application|app|project|product))?/giu;
  for (const match of content.matchAll(createdPattern)) {
    const person = addEntity('person', match[1]);
    primaryPerson ??= person;
    const projectName = cleanValue(match[2]).replace(/\s+(?:mobile\s+)?(?:application|app|project|product)$/i, '').trim();
    if (projectName.length < 2) continue;
    addRelationship(person, GRAPH_RELATIONSHIPS.created, addEntity('project', projectName), 0.92, match[0]);
  }

  if (primaryPerson) {
    // Contact headers often express city and state as a pipe-delimited pair
    // before phone/email values. This only records explicitly present terms.
    for (const line of lines) {
      if (!line.includes('|') || !/(?:@|\+?\d[\d\s()-]{8,})/.test(line)) continue;
      const parts = line.split('|').map(cleanValue).filter(Boolean);
      const locationParts = parts.filter((part) => !EMAIL_PATTERN.test(part) && !PHONE_PATTERN.test(part) && !URL_PATTERN.test(part));
      if (locationParts.length < 2) continue;
      const [city, state] = locationParts;
      if (!/^[\p{L}][\p{L} .'-]{1,80}$/u.test(city) || !/^[\p{L}][\p{L} .'-]{1,80}$/u.test(state)) continue;
      const cityId = addEntity('location', city);
      const stateId = addEntity('location', state);
      addFact(primaryPerson, 'location.city', city, 'string', 0.98, line);
      addFact(primaryPerson, 'location.state', state, 'string', 0.98, line);
      addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.hasLocation, cityId, 0.98, line);
      addRelationship(cityId, GRAPH_RELATIONSHIPS.inRegion, stateId, 0.98, line);
    }

    // Education is extracted from explicit degree wording and its adjacent
    // supporting lines. No dates, status, grade, or institution are inferred.
    const extractedDegrees = new Set<string>();
    for (let index = 0; index < lines.length; index += 1) {
      const degreeMatch = lines[index].match(/\b((?:Bachelor|Master)\s+of\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,5}?)(?=\s+(?:from|with)\b|\s+\d{4}\b|\s*\||[.\n]|$)/i);
      if (!degreeMatch) continue;
      const degree = cleanValue(degreeMatch[1]);
      const degreeKey = degree.toLowerCase().replace(/aplication/g, 'application');
      if (extractedDegrees.has(degreeKey)) continue;
      extractedDegrees.add(degreeKey);
      const context = lines.slice(index, Math.min(lines.length, index + 3));
      const source = context.join('\n');
      const degreeId = addEntity('other', degree, degreeAlias(degree) ? [degreeAlias(degree)!] : []);
      addFact(primaryPerson, 'education.degree', degree, 'string', 0.98, source);
      const alias = degreeAlias(degree);
      if (alias) addFact(primaryPerson, 'education.degree_alias', alias, 'string', 0.98, source);
      addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.hasEducation, degreeId, 0.98, source);
      const institutionMatch = source.match(/\b(?:from|at)\s+([A-Z][A-Za-z& .'-]{2,100}?)(?:\.|\bwith\b|\n|$)/i);
      if (institutionMatch) {
        const institution = cleanValue(institutionMatch[1]);
        const institutionId = addEntity('organization', institution);
        addFact(primaryPerson, 'education.institution', institution, 'string', 0.98, source);
        addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.studiedAt, institutionId, 0.98, source);
      }
      const period = source.match(/\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})\b/);
      if (period) {
        addFact(primaryPerson, 'education.start_year', period[1], 'date', 0.98, source);
        addFact(primaryPerson, 'education.end_year', period[2], 'date', 0.98, source);
      }
      const status = /\b(?:pursuing|attending|ongoing)\b/i.test(source) ? 'pursuing'
        : /\b(?:pursued|completed|graduated)\b/i.test(source) ? 'completed' : null;
      if (status) addFact(primaryPerson, 'education.status', status, 'string', 0.98, source);
      const grade = source.match(/\b((?:first|second|third)\s+class|distinction|[A-Z][+])\s*(?:grade|class)?\b/i)?.[1];
      if (grade) addFact(primaryPerson, 'education.grade', cleanValue(grade), 'string', 0.98, source);
    }

    for (const line of lines) {
      if (/^fresher$/i.test(line)) addFact(primaryPerson, 'experience.status', 'Fresher', 'string', 0.98, line);
      const training = line.match(/^(attending|pursuing|completed)\s+(.+?)\s+from\s+([A-Z][A-Za-z& .'-]{2,120})\.?$/i);
      if (!training) continue;
      const [, status, course, provider] = training;
      const courseName = cleanValue(course);
      // A degree's "pursuing" status is handled by education extraction.
      // Training requires an explicit course/training/certification signal.
      if (!/\b(?:course|training|certification|certificate|bootcamp|workshop)\b/i.test(courseName)) continue;
      const providerName = cleanValue(provider);
      const courseId = addEntity('other', courseName);
      const providerId = addEntity('organization', providerName);
      addFact(primaryPerson, 'training.course', courseName, 'string', 0.98, line);
      addFact(primaryPerson, 'training.institution', providerName, 'string', 0.98, line);
      addFact(primaryPerson, 'training.status', status.toLowerCase(), 'string', 0.98, line);
      addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.attendingCourse, courseId, 0.98, line);
      addRelationship(courseId, GRAPH_RELATIONSHIPS.trainingAt, providerId, 0.98, line);
    }

    // Project-specific technologies are emitted only by their bounded project
    // blocks above. Do not duplicate them as person skills from that section.
    const projectSection = lines.some((line) => /^(?:project(?:\s+work)?|projects)$/i.test(line));
    if (!projectSection) {
      for (const [pattern, technology] of CANONICAL_TECHNOLOGY_ALIASES) {
        if (!pattern.test(content)) continue;
        const technologyId = addEntity('technology', technology);
        const supportingText = lines.find((line) => pattern.test(line)) ?? technology;
        if (/\b(?:may|might|possibly|perhaps|unclear|unknown)\b/i.test(supportingText)) continue;
        addRelationship(primaryPerson, GRAPH_RELATIONSHIPS.usesTechnology, technologyId, 0.94, supportingText);
      }
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
