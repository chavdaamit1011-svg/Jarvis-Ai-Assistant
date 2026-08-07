import type { DetectedResponseLanguage } from '@/lib/ai/response-language';
import { normalizeText } from '@/lib/ai/brain/normalizer/normalize-text';

type FactRecord = { _id: unknown; entityId: unknown; field: string; value: unknown; sourceDocumentId?: unknown; documentId: unknown; sourceChunkId?: unknown; chunkId: unknown; sourceSectionId?: unknown; sourceText: string; confidence: number; isConflicting?: boolean; status?: string };
type RelationshipRecord = { _id: unknown; subjectEntityId?: unknown; sourceEntityId: unknown; relation?: string; relationshipType: string; objectEntityId?: unknown; targetEntityId: unknown; sourceDocumentId?: unknown; documentId: unknown; sourceChunkId?: unknown; chunkId: unknown; sourceText: string; confidence: number; isConflicting?: boolean; qualifiers?: Record<string, unknown> };
type EntityRecord = { _id: unknown; canonicalName: string; entityType: string; aliases?: string[] };

export type StructuredSource = { documentId: string; chunkId: string; documentTitle: string; chunkIndex: number; score: number };
export type StructuredEvidence = { id: string; field: string; value: string; sourceDocumentId: string; sourceChunkId: string; sourceText: string; confidence: number; explicit: boolean };
export type StructuredFactQueryResult = {
  status: 'answer' | 'partial' | 'none';
  operation: 'exact' | 'list' | 'count' | 'status' | 'period' | 'relationship' | 'relationship_lookup' | 'descriptive' | 'unknown';
  requestedFields: string[];
  structuredFactsFound: number;
  relationshipsFound: number;
  explicitFacts: StructuredEvidence[];
  inferredFacts: string[];
  answer?: string;
  sources: StructuredSource[];
  structuredAnswerUsed: boolean;
  ragFallbackUsed: boolean;
  notAvailableReason: string | null;
  finalUnavailable: boolean;
  entitySpecific: boolean;
  semanticConcept: string;
  subfield: string | null;
  filters: Record<string, string | boolean | string[]>;
  projection: string[];
  factsBeforeFiltering: number;
  factsAfterFiltering: number;
  finalSelectedFacts: string[];
  outputMode: 'narrative' | 'values_only';
  matchedProjectEntities: string[];
  relationshipMatches: string[];
  finalSelectedValues: string[];
};

type RecordBundle = { entity: EntityRecord | null; facts: FactRecord[]; relationships: RelationshipRecord[]; projectRelationships: RelationshipRecord[]; targets: EntityRecord[]; targetFacts: FactRecord[]; sources: StructuredSource[] };
type QueryInput = { query: string; requestedFields: string[]; entityId?: string; entityName?: string; language: DetectedResponseLanguage; visibility?: 'public' | 'private' };

const text = (value: unknown) => Array.isArray(value) ? value.map(String).join(', ') : String(value ?? '').trim();
const unique = <T>(values: T[]) => [...new Set(values)];
const id = (value: unknown) => String(value ?? '');
const fieldValues = (facts: FactRecord[], field: string) => facts.filter((fact) => fact.field === field).map((fact) => text(fact.value)).filter(Boolean);
const sourceFor = (record: FactRecord | RelationshipRecord) => ({ documentId: id(record.sourceDocumentId ?? record.documentId), chunkId: id(record.sourceChunkId ?? record.chunkId) });

type StructuredScope = {
  semanticConcept: string;
  subfield: 'backend' | 'frontend' | 'languages' | null;
  operation: StructuredFactQueryResult['operation'];
  filters: Record<string, string | boolean | string[]>;
  projection: string[];
};

const normalizeLookup = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const lookupWords = (value: string) => normalizeLookup(value).split(/\s+/).filter((word) => word.length > 2 && !['commerce', 'project', 'projects', 'give', 'link', 'links', 'only', 'tell', 'about', 'which', 'with', 'used', 'use', 'the', 'and', 'for', 'from', 'have', 'does'].includes(word));
const stem = (word: string) => word.endsWith('s') && word.length > 4 ? word.slice(0, -1) : word;

function isProjectRelationshipQuery(query: string) {
  return /\b(?:in which project|which project .* use|kis project .* use|kaunse project .* use|project .* use kiya|project .* use ki|project .* used)\b/i.test(query);
}

function requestedProjectProjection(query: string) {
  if (/\b(?:link|links|url|urls)\b/i.test(query)) return ['url'];
  if (isProjectRelationshipQuery(query)) return ['project_name'];
  if (/\b(?:tell me about|describe|details?|explain)\b/i.test(query)) return ['description'];
  return ['project_name'];
}

function scopeFor(query: string, fields: string[]): StructuredScope {
  const value = query.toLowerCase();
  const semanticConcept = intentFor(query, fields);
  const subfield = /\b(?:backend|server[ -]?side|server)\b/i.test(query)
    ? 'backend'
    : /\b(?:frontend|front[ -]?end|client[ -]?side|ui)\b/i.test(query)
      ? 'frontend'
      : /\b(?:languages? known|programming languages?|kaunsi languages?|konsi languages?)\b/i.test(query)
        ? 'languages'
        : null;
  const wantsCurrent = /\b(?:current(?:ly)?|now|present|abhi|haal(?:\s+me)?|aajkal)\b/i.test(query);
  const wantsPursuing = /\b(?:pursuing|pursue|attending|ongoing|chal rahi|kar raha|kar rahi)\b/i.test(query);
  const wantsCompleted = /\b(?:completed|complete|graduated|finished|pursued|pass out|complete ki|complete kiya)\b/i.test(query);
  const filters: StructuredScope['filters'] = {};
  if (semanticConcept === 'education' && (wantsCurrent || wantsPursuing)) filters.status = ['pursuing', 'active', 'attending'];
  else if (semanticConcept === 'education' && wantsCompleted) filters.status = 'completed';
  if (subfield) filters.category = subfield;
  const degreeMention = value.match(/\b(?:b\.?com|bachelor\s+of\s+commerce|m\.?c\.?a|master\s+of\s+computer\s+application)\b/i)?.[0];
  if (degreeMention) filters.degree = degreeMention;
  const projection = semanticConcept === 'education'
    ? ['education.degree', 'education.degree_alias', 'education.institution', 'education.start_year', 'education.end_year', 'education.status', 'education.grade']
    : semanticConcept === 'technology'
      ? subfield ? [`technology.${subfield}`] : ['technology']
      : semanticConcept === 'location'
        ? ['location.city', 'location.state', 'location.address', 'location.country']
        : semanticConcept === 'projects'
          ? requestedProjectProjection(query)
          : [];
  const operation = semanticConcept === 'projects' && isProjectRelationshipQuery(query) ? 'relationship_lookup' : operationFor(query);
  if (semanticConcept === 'projects' && /\b(?:completed|complete|finished)\b/i.test(query)) filters.status = 'completed';
  return { semanticConcept, subfield, operation, filters, projection };
}

function relationshipTechnologyCategory(relationship: RelationshipRecord) {
  const source = `${relationship.sourceText} ${JSON.stringify(relationship.qualifiers ?? {})}`.toLowerCase();
  if (/\b(?:front[ -]?end|client[ -]?side|ui)\b/.test(source)) return 'frontend';
  if (/\b(?:back[ -]?end|server[ -]?side|database|api)\b/.test(source)) return 'backend';
  if (/\b(?:languages? known|programming languages?)\b/.test(source)) return 'languages';
  return null;
}

function operationFor(query: string): StructuredFactQueryResult['operation'] {
  if (/\b(?:how many|total|count|kitn[aei]|ketl[ao])\b/i.test(query)) return 'count';
  if (/\b(?:year|years|when|period|duration|kab|konsa year)\b/i.test(query)) return 'period';
  if (/\b(?:status|pursuing|completed|attending|fresher)\b/i.test(query)) return 'status';
  if (/\b(?:list|which|what are|kaunse|konsa|batao)\b/i.test(query)) return 'list';
  if (/\b(?:explain|describe|details?|tell me about)\b/i.test(query)) return 'descriptive';
  return 'exact';
}

function intentFor(query: string, fields: string[]) {
  const value = query.toLowerCase();
  if (/\b(?:birth ?date|date of birth|dob)\b/.test(value)) return 'birthdate';
  const hasSpecificField = fields.some((field) => field !== 'summary' && field !== 'unknown');
  if (fields.includes('summary') || (!hasSpecificField && /\b(?:who (?:is|are)|tell me about|about|profile|introduction|introduce|kaun hai|kon hai|ke bare me|iske bare me)\b/i.test(query))) return 'profile';
  if (/\b(?:where .*live|lives|rehta|rehte|reside|city|state|location|kahan)\b/i.test(query)) return 'location';
  if (/\b(?:course|training|certificate|certification)\b/i.test(query) || fields.includes('certifications')) return 'training';
  if (/\b(?:degree|education|university|college|study|studied|academic|qualification|padhai|bhany|b\.?com|m\.?c\.?a|b\.?tech|m\.?tech|ph\.?d|mba|bba|bca)\b/i.test(query) || fields.includes('education')) return 'education';
  if (/\b(?:project|projects|built|created|applications?)\b/i.test(query) || fields.includes('projects')) return 'projects';
  if (/\b(?:skills?|technolog(?:y|ies)|tech stack|works? with)\b/i.test(query) || fields.includes('skills') || fields.includes('technologies')) return 'technology';
  if (/\b(?:email|phone|mobile|linkedin|github|website|portfolio|contact)\b/i.test(query) || fields.some((field) => /(?:url|email|phone|contact)/.test(field))) return 'contact';
  if (/\b(?:owner|owns|worked on|works at|relationship)\b/i.test(query)) return 'relationship';
  return 'unknown';
}

function join(values: string[], language: DetectedResponseLanguage) {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} ${language === 'english' ? 'and' : language === 'gujarati_roman' ? 'ane' : 'aur'} ${values.at(-1)}`;
}

function unavailableReason(intent: string) {
  return `No supported ${intent === 'unknown' ? 'requested' : intent} fact exists for this entity.`;
}

function evidence(records: FactRecord[]) {
  return records.map((record) => ({ id: id(record._id), field: record.field, value: text(record.value), sourceDocumentId: id(record.sourceDocumentId ?? record.documentId), sourceChunkId: id(record.sourceChunkId ?? record.chunkId), sourceText: record.sourceText, confidence: record.confidence, explicit: true }));
}

function relationshipEvidence(records: RelationshipRecord[], targets: EntityRecord[], field: string) {
  return records.map((record) => ({
    id: id(record._id),
    field,
    value: targets.find((target) => id(target._id) === id(record.objectEntityId ?? record.targetEntityId))?.canonicalName ?? '',
    sourceDocumentId: id(record.sourceDocumentId ?? record.documentId),
    sourceChunkId: id(record.sourceChunkId ?? record.chunkId),
    sourceText: record.sourceText,
    confidence: record.confidence,
    explicit: true,
  }));
}

function findMatchingProjectIds(query: string, projects: EntityRecord[]) {
  const queryValue = normalizeLookup(query);
  const queryWords = new Set(lookupWords(queryValue).map(stem));
  const candidates = projects.map((project) => {
    const labels = [project.canonicalName, ...(project.aliases ?? [])];
    const score = Math.max(...labels.map((label) => {
      const normalizedLabel = normalizeLookup(label);
      if (normalizedLabel && queryValue.includes(normalizedLabel)) return 100;
      return lookupWords(label).map(stem).filter((word) => queryWords.has(word)).length;
    }));
    return { project, score };
  }).filter((candidate) => candidate.score > 0);
  if (!candidates.length) return new Set<string>();
  const best = Math.max(...candidates.map((candidate) => candidate.score));
  // One significant matching name word is enough only if it is unique among
  // stored project entities. Otherwise require a stronger exact/compound match.
  const winners = candidates.filter((candidate) => candidate.score === best && (best >= 2 || candidates.length === 1 || best === 100));
  return new Set(winners.map((candidate) => id(candidate.project._id)));
}

function findTechnologyIdsInQuery(query: string, technologies: EntityRecord[]) {
  const normalizedQuery = normalizeLookup(query);
  return new Set(technologies.filter((technology) => {
    const normalizedName = normalizeLookup(technology.canonicalName);
    const shortName = normalizedName.replace(/\b(?:js|ts)\b/g, '').trim();
    return normalizedName.length > 2 && (normalizedQuery.includes(normalizedName) || (shortName.length > 2 && normalizedQuery.includes(shortName)));
  }).map((technology) => id(technology._id)));
}

function answerFor(input: { query: string; fields: string[]; language: DetectedResponseLanguage; bundle: RecordBundle }): Omit<StructuredFactQueryResult, 'sources'> {
  const { query, fields, language, bundle } = input;
  const normalizedQuery = normalizeText(query).cleanedQuery;
  const scope = scopeFor(normalizedQuery, fields);
  const intent = scope.semanticConcept;
  const operation = scope.operation;
  const facts = bundle.facts.filter((fact) => fact.status !== 'rejected' && !fact.isConflicting);
  const relationships = bundle.relationships.filter((relationship) => !relationship.isConflicting);
  const base = { operation, requestedFields: fields, structuredFactsFound: facts.length, relationshipsFound: relationships.length, explicitFacts: [] as StructuredEvidence[], inferredFacts: [] as string[], sources: [] as StructuredSource[], structuredAnswerUsed: false, ragFallbackUsed: false, notAvailableReason: null as string | null, finalUnavailable: false, entitySpecific: Boolean(bundle.entity), semanticConcept: intent, subfield: scope.subfield, filters: scope.filters, projection: scope.projection, factsBeforeFiltering: facts.length, factsAfterFiltering: 0, finalSelectedFacts: [] as string[], outputMode: 'narrative' as const, matchedProjectEntities: [] as string[], relationshipMatches: [] as string[], finalSelectedValues: [] as string[] };
  const name = bundle.entity?.canonicalName ?? 'The entity';

  if (!bundle.entity) return { ...base, status: 'none' as const, notAvailableReason: 'No resolved entity was supplied.' };
  if (intent === 'birthdate') return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent), finalUnavailable: true };
  // Do not send an explicitly entity-scoped but unsupported personal field to
  // semantic RAG. RAG can supplement descriptive fields, but it must not turn
  // an absent salary, birth date, family detail, or other unknown field into a
  // guessed answer.
  if (intent === 'unknown' && (!fields.length || fields.every((field) => field === 'unknown'))) {
    return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent), finalUnavailable: true };
  }

  if (intent === 'profile') {
    const profileFacts = facts.filter((fact) => [
      'experience.status', 'profession', 'role', 'location.city', 'location.state',
      'education.degree', 'education.institution', 'education.start_year', 'education.end_year', 'education.status', 'education.grade',
      'training.course', 'training.institution', 'training.status',
    ].includes(fact.field));
    const city = fieldValues(profileFacts, 'location.city')[0];
    const state = fieldValues(profileFacts, 'location.state')[0];
    const status = fieldValues(profileFacts, 'experience.status')[0];
    const groupedEducation = new Map<string, FactRecord[]>();
    for (const fact of profileFacts.filter((fact) => fact.field.startsWith('education.'))) {
      const key = id(fact.sourceSectionId) || id(fact._id);
      groupedEducation.set(key, [...(groupedEducation.get(key) ?? []), fact]);
    }
    const education = [...groupedEducation.values()].map((entry) => {
      const degree = fieldValues(entry, 'education.degree')[0];
      const institution = fieldValues(entry, 'education.institution')[0];
      const start = fieldValues(entry, 'education.start_year')[0];
      const end = fieldValues(entry, 'education.end_year')[0];
      const degreeStatus = fieldValues(entry, 'education.status')[0];
      const grade = fieldValues(entry, 'education.grade')[0];
      return [degree, institution, start && end ? `${start}-${end}` : '', degreeStatus, grade].filter(Boolean).join(' — ');
    }).filter(Boolean);
    const techIds = new Set(relationships.filter((relationship) => (relationship.relation ?? relationship.relationshipType) === 'USES_TECHNOLOGY').map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const technologies = bundle.targets.filter((target) => techIds.has(id(target._id)) && target.entityType === 'technology').map((target) => target.canonicalName);
    const projectIds = new Set(relationships.filter((relationship) => ['WORKED_ON', 'BUILT', 'CREATED'].includes(relationship.relation ?? relationship.relationshipType)).map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const projects = bundle.targets.filter((target) => projectIds.has(id(target._id)) && target.entityType === 'project').map((target) => target.canonicalName);
    const course = fieldValues(profileFacts, 'training.course')[0];
    const trainingInstitution = fieldValues(profileFacts, 'training.institution')[0];
    const trainingStatus = fieldValues(profileFacts, 'training.status')[0];
    const sentences: string[] = [];
    if (language === 'english') {
      sentences.push(`${name}${status ? ` is a ${status.toLowerCase()}` : ''}${city || state ? `${status ? ' based' : ' is based'} in ${[city, state].filter(Boolean).join(', ')}` : ''}.`.replace('..', '.'));
      if (education.length) sentences.push(`Education: ${education.join('; ')}.`);
      if (technologies.length) sentences.push(`Technologies: ${join(technologies, language)}.`);
      if (projects.length) sentences.push(`Documented projects (${projects.length}): ${join(projects, language)}.`);
      if (course) sentences.push(`Training: ${[course, trainingInstitution, trainingStatus].filter(Boolean).join(' — ')}.`);
    } else {
      sentences.push(`${name}${status ? ` ${status.toLowerCase()} hain` : ''}${city || state ? `${status ? ' aur' : ''} ${[city, state].filter(Boolean).join(', ')} mein based hain` : ''}.`.replace('..', '.'));
      if (education.length) sentences.push(`Education: ${education.join('; ')}.`);
      if (technologies.length) sentences.push(`Technologies: ${join(technologies, language)}.`);
      if (projects.length) sentences.push(`Documented projects (${projects.length}): ${join(projects, language)}.`);
      if (course) sentences.push(`Training: ${[course, trainingInstitution, trainingStatus].filter(Boolean).join(' — ')}.`);
    }
    if (!profileFacts.length && !technologies.length && !projects.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    return { ...base, status: 'answer' as const, answer: sentences.join('\n'), explicitFacts: evidence(profileFacts), structuredAnswerUsed: true, factsAfterFiltering: profileFacts.length, finalSelectedFacts: profileFacts.map((fact) => `${fact.field}: ${text(fact.value)}`) };
  }

  if (intent === 'location') {
    const selected = facts.filter((fact) => ['location.city', 'location.state', 'location.address', 'location.country'].includes(fact.field));
    const city = fieldValues(selected, 'location.city')[0]; const state = fieldValues(selected, 'location.state')[0];
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const place = [city, state].filter(Boolean).join(', ') || join(selected.map((fact) => text(fact.value)), language);
    const answer = language === 'english' ? `${name}'s stored location is ${place}.` : language === 'gujarati_roman' ? `${name} ni stored location ${place} chhe.` : `${name} ki stored location ${place} hai.`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selected), structuredAnswerUsed: true, factsAfterFiltering: selected.length, finalSelectedFacts: selected.map((fact) => `${fact.field}: ${text(fact.value)}`) };
  }

  if (intent === 'education') {
    const selected = facts.filter((fact) => fact.field.startsWith('education.'));
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const groups = new Map<string, FactRecord[]>();
    for (const fact of selected) { const key = id(fact.sourceSectionId) || id(fact._id); groups.set(key, [...(groups.get(key) ?? []), fact]); }
    let entries = [...groups.values()];
    const degreeMention = typeof scope.filters.degree === 'string' ? scope.filters.degree.toLowerCase() : undefined;
    if (degreeMention) {
      const normalizedDegree = degreeMention.replace(/[^\p{L}\p{N}]/gu, '');
      entries = entries.filter((entry) => entry.some((fact) => {
        const normalizedValue = text(fact.value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        return normalizedValue.includes(normalizedDegree) || normalizedDegree.includes(normalizedValue);
      }));
    }
    const statuses = Array.isArray(scope.filters.status) ? scope.filters.status : scope.filters.status ? [scope.filters.status] : [];
    if (statuses.length) entries = entries.filter((entry) => entry.some((fact) => fact.field === 'education.status' && statuses.includes(text(fact.value).toLowerCase())));
    if (!entries.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const selectedFacts = entries.flat();
    const summaries = entries.map((entry) => {
      const degree = fieldValues(entry, 'education.degree')[0] ?? 'Education record';
      const institution = fieldValues(entry, 'education.institution')[0];
      const start = fieldValues(entry, 'education.start_year')[0]; const end = fieldValues(entry, 'education.end_year')[0];
      const status = fieldValues(entry, 'education.status')[0]; const grade = fieldValues(entry, 'education.grade')[0];
      return [degree, institution, start && end ? `${start}–${end}` : '', status, grade].filter(Boolean).join(' — ');
    });
    const onlyInstitutions = /\b(?:university|college|institution|where .*study|kahan .*padh)\b/i.test(query);
    const onlyPeriod = operation === 'period';
    let answer: string;
    if (operation === 'count') answer = language === 'english' ? `${name} has ${entries.length} supported education records:\n${summaries.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : `${name} ke ${entries.length} supported education records hain:\n${summaries.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
    else if (onlyInstitutions) answer = language === 'english' ? `${name} studied at ${join(unique(entries.flatMap((entry) => fieldValues(entry, 'education.institution'))), language)}.` : `${name} ne ${join(unique(entries.flatMap((entry) => fieldValues(entry, 'education.institution'))), language)} mein padhai ki hai.`;
    else if (onlyPeriod) answer = summaries.map((item) => language === 'english' ? `${name}: ${item}` : `${name}: ${item}`).join('\n');
    else answer = language === 'english' ? `${name}'s education:\n${summaries.map((item) => `- ${item}`).join('\n')}` : `${name} ki education:\n${summaries.map((item) => `- ${item}`).join('\n')}`;
    const inferredFacts = /\b(?:field|domain|stream|related)\b/i.test(query) && selectedFacts.some((fact) => /^MCA$/i.test(text(fact.value))) ? ['MCA is safely categorized as a Computer Applications / IT-related field.'] : [];
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selectedFacts), inferredFacts, structuredAnswerUsed: true, factsAfterFiltering: selectedFacts.length, finalSelectedFacts: selectedFacts.map((fact) => `${fact.field}: ${text(fact.value)}`) };
  }

  if (intent === 'training') {
    const selected = facts.filter((fact) => fact.field.startsWith('training.') || fact.field === 'certification');
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const course = fieldValues(selected, 'training.course')[0] ?? fieldValues(selected, 'certification')[0];
    const institution = fieldValues(selected, 'training.institution')[0]; const status = fieldValues(selected, 'training.status')[0];
    const answer = language === 'english' ? `${name}'s supported training: ${[course, institution, status].filter(Boolean).join(' — ')}.` : `${name} ki supported training: ${[course, institution, status].filter(Boolean).join(' — ')}.`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selected), structuredAnswerUsed: true, factsAfterFiltering: selected.length, finalSelectedFacts: selected.map((fact) => `${fact.field}: ${text(fact.value)}`) };
  }

  if (intent === 'projects') {
    const projectRelations = relationships.filter((relationship) => ['WORKED_ON', 'BUILT', 'CREATED'].includes(relationship.relation ?? relationship.relationshipType));
    const knownProjectIds = new Set(projectRelations.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const allProjects = bundle.targets.filter((target) => knownProjectIds.has(id(target._id)) && target.entityType === 'project');
    if (!allProjects.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };

    const requestedProjectIds = findMatchingProjectIds(normalizedQuery, allProjects);
    const projects = requestedProjectIds.size ? allProjects.filter((project) => requestedProjectIds.has(id(project._id))) : allProjects;
    const matchedProjectEntities = projects.map((project) => project.canonicalName);
    const selectedProjectIds = new Set(projects.map((project) => id(project._id)));
    const projectFacts = bundle.targetFacts.filter((fact) => selectedProjectIds.has(id(fact.entityId)));
    const completionFacts = projectFacts.filter((fact) => /(?:^|\.)status$|completion/i.test(fact.field));
    if (scope.filters.status === 'completed' && !completionFacts.some((fact) => /completed/i.test(text(fact.value)))) {
      const answer = language === 'english' ? `${allProjects.length} projects are documented, but completion status is not specified.` : `${allProjects.length} projects documented hain, lekin completion status specified nahi hai.`;
      return { ...base, status: 'answer' as const, answer, structuredAnswerUsed: true, matchedProjectEntities, finalSelectedValues: [String(allProjects.length)] };
    }

    const projectTechnologyRelationships = bundle.projectRelationships.filter((relationship) => selectedProjectIds.has(id(relationship.sourceEntityId)) && (relationship.relation ?? relationship.relationshipType) === 'USES_TECHNOLOGY');
    const technologies = bundle.targets.filter((target) => target.entityType === 'technology');
    const technologyIds = findTechnologyIdsInQuery(normalizedQuery, technologies);
    const relationshipMatches = technologyIds.size ? projectTechnologyRelationships.filter((relationship) => technologyIds.has(id(relationship.objectEntityId ?? relationship.targetEntityId))) : [];
    if (operation === 'relationship_lookup' && !relationshipMatches.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent), matchedProjectEntities };
    const relationProjectIds = new Set(relationshipMatches.map((relationship) => id(relationship.sourceEntityId)));
    const selectedProjects = operation === 'relationship_lookup' ? projects.filter((project) => relationProjectIds.has(id(project._id))) : projects;
    const finalProjectIds = new Set(selectedProjects.map((project) => id(project._id)));
    const selectedFacts = projectFacts.filter((fact) => finalProjectIds.has(id(fact.entityId)));
    const descriptions = new Map(selectedFacts.filter((fact) => fact.field === 'description').map((fact) => [id(fact.entityId), text(fact.value)]));
    const urls = new Map(selectedFacts.filter((fact) => fact.field === 'project_url').map((fact) => [id(fact.entityId), text(fact.value)]));
    const projectNames = selectedProjects.map((project) => project.canonicalName);
    const urlValues = selectedProjects.map((project) => urls.get(id(project._id))).filter((value): value is string => Boolean(value));
    const valuesOnly = scope.projection.length === 1 && scope.projection[0] === 'url';
    let answer: string;
    let finalSelectedValues: string[];
    if (operation === 'count') {
      answer = language === 'english' ? `${name} has ${selectedProjects.length} documented projects.` : `${name} ke ${selectedProjects.length} documented projects hain.`;
      finalSelectedValues = [String(selectedProjects.length)];
    } else if (valuesOnly) {
      if (!urlValues.length) return { ...base, status: 'none' as const, notAvailableReason: 'No supported project URL exists for the selected project.', matchedProjectEntities };
      answer = urlValues.join('\n');
      finalSelectedValues = urlValues;
    } else if (operation === 'relationship_lookup') {
      answer = projectNames.join('\n');
      finalSelectedValues = projectNames;
    } else if (scope.projection.includes('description')) {
      answer = selectedProjects.map((project) => descriptions.get(id(project._id)) ? `${project.canonicalName}: ${descriptions.get(id(project._id))}` : project.canonicalName).join('\n');
      finalSelectedValues = selectedProjects.map((project) => descriptions.get(id(project._id))).filter((value): value is string => Boolean(value));
    } else {
      answer = language === 'english' ? `${name}'s documented projects:\n${projectNames.map((project, index) => `${index + 1}. ${project}`).join('\n')}` : `${name} ke documented projects:\n${projectNames.map((project, index) => `${index + 1}. ${project}`).join('\n')}`;
      finalSelectedValues = projectNames;
    }
    const relevantProjectFacts = operation === 'count'
      ? projectRelations.filter((relationship) => finalProjectIds.has(id(relationship.objectEntityId ?? relationship.targetEntityId))).map((relationship) => ({
        id: id(relationship._id), field: 'project.relationship', value: bundle.targets.find((target) => id(target._id) === id(relationship.objectEntityId ?? relationship.targetEntityId))?.canonicalName ?? '', sourceDocumentId: id(relationship.sourceDocumentId ?? relationship.documentId), sourceChunkId: id(relationship.sourceChunkId ?? relationship.chunkId), sourceText: relationship.sourceText, confidence: relationship.confidence, explicit: true,
      }))
      : valuesOnly
        ? evidence(selectedFacts.filter((fact) => fact.field === 'project_url'))
        : operation === 'relationship_lookup'
          ? relationshipEvidence(relationshipMatches, bundle.targets, 'project.uses_technology')
          : scope.projection.includes('description')
            ? evidence(selectedFacts.filter((fact) => fact.field === 'description'))
            : evidence(selectedFacts);
    const selectedEvidence = relevantProjectFacts;
    return { ...base, status: 'answer' as const, answer, explicitFacts: selectedEvidence, structuredAnswerUsed: true, factsAfterFiltering: selectedFacts.length + relationshipMatches.length, finalSelectedFacts: selectedEvidence.map((fact) => `${fact.field}: ${fact.value}`), outputMode: valuesOnly ? 'values_only' : 'narrative', matchedProjectEntities, relationshipMatches: relationshipMatches.map((relationship) => id(relationship._id)), finalSelectedValues };

    /* Legacy project formatter retained below only as unreachable reference while
       the scoped formatter above is exercised by all live project requests. */
    {
    const projectRelations = relationships.filter((relationship) => ['WORKED_ON', 'BUILT', 'CREATED'].includes(relationship.relation ?? relationship.relationshipType));
    const projectIds = new Set(projectRelations.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const projects = bundle.targets.filter((target) => projectIds.has(id(target._id)) && target.entityType === 'project');
    if (!projects.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const projectFacts = bundle.targetFacts.filter((fact) => projectIds.has(id(fact.entityId)));
    const descriptions = new Map(projectFacts.filter((fact) => fact.field === 'description').map((fact) => [id(fact.entityId), text(fact.value)]));
    const urls = new Map(projectFacts.filter((fact) => fact.field === 'project_url').map((fact) => [id(fact.entityId), text(fact.value)]));
    const list = projects.map((project, index) => {
      const info = [descriptions.get(id(project._id)), urls.get(id(project._id))].filter(Boolean).join(' — ');
      return `${index + 1}. ${project.canonicalName}${info ? ` — ${info}` : ''}`;
    });
    const answer = operation === 'count'
      ? language === 'english' ? `${name} has ${projects.length} supported projects:\n${list.join('\n')}` : `${name} ke ${projects.length} supported projects hain:\n${list.join('\n')}`
      : language === 'english' ? `${name}'s supported projects:\n${list.join('\n')}` : `${name} ke supported projects:\n${list.join('\n')}`;
    return { ...base, status: operation === 'descriptive' ? 'partial' as const : 'answer' as const, answer, explicitFacts: evidence(projectFacts), structuredAnswerUsed: operation !== 'descriptive', ragFallbackUsed: operation === 'descriptive', notAvailableReason: operation === 'descriptive' ? 'Project descriptions may need supporting chunk context.' : null, factsAfterFiltering: projectFacts.length, finalSelectedFacts: projectFacts.map((fact) => `${fact.field}: ${text(fact.value)}`) };
    }
  }

  if (intent === 'technology') {
    const techRelations = relationships.filter((relationship) => (relationship.relation ?? relationship.relationshipType) === 'USES_TECHNOLOGY');
    const scopedRelations = scope.subfield ? techRelations.filter((relationship) => relationshipTechnologyCategory(relationship) === scope.subfield) : techRelations;
    const techIds = new Set(scopedRelations.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const names = bundle.targets.filter((target) => techIds.has(id(target._id)) && target.entityType === 'technology').map((target) => target.canonicalName);
    if (!names.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const label = scope.subfield ? `${scope.subfield} technologies` : 'technologies';
    const answer = language === 'english' ? `${name}'s ${label}: ${join(names, language)}.` : `${name} ki ${label}: ${join(names, language)}.`;
    const relationEvidence = scopedRelations.map((relationship) => ({ id: id(relationship._id), field: `technology.${scope.subfield ?? 'general'}`, value: bundle.targets.find((target) => id(target._id) === id(relationship.objectEntityId ?? relationship.targetEntityId))?.canonicalName ?? '', sourceDocumentId: id(relationship.sourceDocumentId ?? relationship.documentId), sourceChunkId: id(relationship.sourceChunkId ?? relationship.chunkId), sourceText: relationship.sourceText, confidence: relationship.confidence, explicit: true }));
    return { ...base, status: 'answer' as const, answer, explicitFacts: relationEvidence, structuredAnswerUsed: true, factsAfterFiltering: relationEvidence.length, finalSelectedFacts: relationEvidence.map((fact) => `${fact.field}: ${fact.value}`) };
  }

  if (intent === 'contact') {
    const candidates = fields.length ? facts.filter((fact) => fields.includes(fact.field)) : facts.filter((fact) => /(?:email|phone|url|contact)/.test(fact.field));
    if (!candidates.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const answer = language === 'english' ? `${name}'s supported contact details:\n${candidates.map((fact) => `- ${fact.field}: ${text(fact.value)}`).join('\n')}` : `${name} ki supported contact details:\n${candidates.map((fact) => `- ${fact.field}: ${text(fact.value)}`).join('\n')}`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(candidates), structuredAnswerUsed: true, factsAfterFiltering: candidates.length, finalSelectedFacts: candidates.map((fact) => `${fact.field}: ${text(fact.value)}`) };
  }

  return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
}

async function loadRecords(input: QueryInput): Promise<RecordBundle> {
  // Keep the pure formatter independently testable. Database-only modules are
  // loaded only for a real server query, never from a client or unit test.
  const [
    { connectToDatabase },
    { default: KnowledgeChunk },
    { default: KnowledgeDocument },
    { default: KnowledgeEntity },
    { default: KnowledgeFact },
    { default: KnowledgeRelationship },
  ] = await Promise.all([
    import('@/lib/db/connect'),
    import('@/models/KnowledgeChunk'),
    import('@/models/KnowledgeDocument'),
    import('@/models/KnowledgeEntity'),
    import('@/models/KnowledgeFact'),
    import('@/models/KnowledgeRelationship'),
  ]);
  await connectToDatabase();
  const entity = input.entityId ? await KnowledgeEntity.findById(input.entityId).select('canonicalName entityType aliases').lean() as unknown as EntityRecord | null : null;
  if (!entity) return { entity: null, facts: [], relationships: [], projectRelationships: [], targets: [], targetFacts: [], sources: [] };
  const [facts, relationships] = await Promise.all([
    KnowledgeFact.find({ entityId: input.entityId, status: 'active', isConflicting: { $ne: true } }).lean() as unknown as Promise<FactRecord[]>,
    KnowledgeRelationship.find({ sourceEntityId: input.entityId, isConflicting: { $ne: true } }).lean() as unknown as Promise<RelationshipRecord[]>,
  ]);
  const targetIds = unique(relationships.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)).filter(Boolean));
  const projectRelationships = targetIds.length ? await KnowledgeRelationship.find({ sourceEntityId: { $in: targetIds }, isConflicting: { $ne: true } }).lean() as unknown as RelationshipRecord[] : [];
  const nestedTargetIds = unique(projectRelationships.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)).filter(Boolean));
  const allTargetIds = unique([...targetIds, ...nestedTargetIds]);
  const targets = allTargetIds.length ? await KnowledgeEntity.find({ _id: { $in: allTargetIds } }).select('canonicalName entityType aliases').lean() as unknown as EntityRecord[] : [];
  const targetFacts = targetIds.length ? await KnowledgeFact.find({ entityId: { $in: targetIds }, status: 'active', isConflicting: { $ne: true } }).lean() as unknown as FactRecord[] : [];
  const evidenceRecords = [...facts, ...relationships, ...projectRelationships, ...targetFacts];
  const documentIds = unique(evidenceRecords.map(sourceFor).map((source) => source.documentId).filter(Boolean));
  const documents = documentIds.length ? await KnowledgeDocument.find({ _id: { $in: documentIds }, status: 'ready', visibility: input.visibility ?? 'public' }).select('title').lean() : [];
  const allowed = new Map(documents.map((document) => [id(document._id), document.title]));
  const allowedRecords = evidenceRecords.filter((record) => allowed.has(sourceFor(record).documentId));
  const chunkIds = unique(allowedRecords.map(sourceFor).map((source) => source.chunkId).filter(Boolean));
  const chunks = chunkIds.length ? await KnowledgeChunk.find({ _id: { $in: chunkIds } }).select('documentId chunkIndex').lean() : [];
  const chunkMap = new Map(chunks.map((chunk) => [id(chunk._id), chunk]));
  const sources = unique(allowedRecords.map((record) => JSON.stringify(sourceFor(record)))).flatMap((key) => {
    const source = JSON.parse(key) as { documentId: string; chunkId: string };
    const chunk = chunkMap.get(source.chunkId);
    const title = allowed.get(source.documentId);
    return chunk && title ? [{ documentId: source.documentId, chunkId: source.chunkId, documentTitle: title, chunkIndex: chunk.chunkIndex, score: 1 }] : [];
  });
  const keep = <T extends FactRecord | RelationshipRecord>(records: T[]) => records.filter((record) => allowed.has(sourceFor(record).documentId));
  return { entity, facts: keep(facts), relationships: keep(relationships), projectRelationships: keep(projectRelationships), targets, targetFacts: keep(targetFacts), sources };
}

/** Queries only stored, source-backed facts and relationships. It never calls an LLM. */
export async function queryStructuredFacts(input: QueryInput): Promise<StructuredFactQueryResult> {
  const bundle = await loadRecords(input);
  const result = answerFor({ query: input.query, fields: input.requestedFields, language: input.language, bundle });
  return { ...result, sources: result.explicitFacts.length || result.relationshipsFound ? bundle.sources : [] };
}

export const structuredFactTesting = { answerFor };
