import type { DetectedResponseLanguage } from '@/lib/ai/response-language';

type FactRecord = { _id: unknown; entityId: unknown; field: string; value: unknown; sourceDocumentId?: unknown; documentId: unknown; sourceChunkId?: unknown; chunkId: unknown; sourceSectionId?: unknown; sourceText: string; confidence: number; isConflicting?: boolean; status?: string };
type RelationshipRecord = { _id: unknown; subjectEntityId?: unknown; sourceEntityId: unknown; relation?: string; relationshipType: string; objectEntityId?: unknown; targetEntityId: unknown; sourceDocumentId?: unknown; documentId: unknown; sourceChunkId?: unknown; chunkId: unknown; sourceText: string; confidence: number; isConflicting?: boolean };
type EntityRecord = { _id: unknown; canonicalName: string; entityType: string };

export type StructuredSource = { documentId: string; chunkId: string; documentTitle: string; chunkIndex: number; score: number };
export type StructuredEvidence = { id: string; field: string; value: string; sourceDocumentId: string; sourceChunkId: string; sourceText: string; confidence: number; explicit: boolean };
export type StructuredFactQueryResult = {
  status: 'answer' | 'partial' | 'none';
  operation: 'exact' | 'list' | 'count' | 'status' | 'period' | 'relationship' | 'descriptive' | 'unknown';
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
};

type RecordBundle = { entity: EntityRecord | null; facts: FactRecord[]; relationships: RelationshipRecord[]; targets: EntityRecord[]; targetFacts: FactRecord[]; sources: StructuredSource[] };
type QueryInput = { query: string; requestedFields: string[]; entityId?: string; entityName?: string; language: DetectedResponseLanguage; visibility?: 'public' | 'private' };

const text = (value: unknown) => Array.isArray(value) ? value.map(String).join(', ') : String(value ?? '').trim();
const unique = <T>(values: T[]) => [...new Set(values)];
const id = (value: unknown) => String(value ?? '');
const fieldValues = (facts: FactRecord[], field: string) => facts.filter((fact) => fact.field === field).map((fact) => text(fact.value)).filter(Boolean);
const sourceFor = (record: FactRecord | RelationshipRecord) => ({ documentId: id(record.sourceDocumentId ?? record.documentId), chunkId: id(record.sourceChunkId ?? record.chunkId) });

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

function answerFor(input: { query: string; fields: string[]; language: DetectedResponseLanguage; bundle: RecordBundle }): Omit<StructuredFactQueryResult, 'sources'> {
  const { query, fields, language, bundle } = input;
  const intent = intentFor(query, fields);
  const operation = operationFor(query);
  const facts = bundle.facts.filter((fact) => fact.status !== 'rejected' && !fact.isConflicting);
  const relationships = bundle.relationships.filter((relationship) => !relationship.isConflicting);
  const base = { operation, requestedFields: fields, structuredFactsFound: facts.length, relationshipsFound: relationships.length, explicitFacts: [] as StructuredEvidence[], inferredFacts: [] as string[], sources: [] as StructuredSource[], structuredAnswerUsed: false, ragFallbackUsed: false, notAvailableReason: null as string | null, finalUnavailable: false, entitySpecific: Boolean(bundle.entity) };
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
    return { ...base, status: 'answer' as const, answer: sentences.join('\n'), explicitFacts: evidence(profileFacts), structuredAnswerUsed: true };
  }

  if (intent === 'location') {
    const selected = facts.filter((fact) => ['location.city', 'location.state', 'location.address', 'location.country'].includes(fact.field));
    const city = fieldValues(selected, 'location.city')[0]; const state = fieldValues(selected, 'location.state')[0];
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const place = [city, state].filter(Boolean).join(', ') || join(selected.map((fact) => text(fact.value)), language);
    const answer = language === 'english' ? `${name}'s stored location is ${place}.` : language === 'gujarati_roman' ? `${name} ni stored location ${place} chhe.` : `${name} ki stored location ${place} hai.`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selected), structuredAnswerUsed: true };
  }

  if (intent === 'education') {
    const selected = facts.filter((fact) => fact.field.startsWith('education.'));
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const groups = new Map<string, FactRecord[]>();
    for (const fact of selected) { const key = id(fact.sourceSectionId) || id(fact._id); groups.set(key, [...(groups.get(key) ?? []), fact]); }
    let entries = [...groups.values()];
    const degreeMention = query.match(/\b(?:b\.?com|bachelor\s+of\s+commerce|m\.?c\.?a|master\s+of\s+computer\s+ap+lication)\b/i)?.[0]?.toLowerCase();
    if (degreeMention) {
      const normalizedDegree = degreeMention.replace(/[^\p{L}\p{N}]/gu, '');
      entries = entries.filter((entry) => entry.some((fact) => {
        const normalizedValue = text(fact.value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        return normalizedValue.includes(normalizedDegree) || normalizedDegree.includes(normalizedValue);
      }));
    }
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
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selectedFacts), inferredFacts, structuredAnswerUsed: true };
  }

  if (intent === 'training') {
    const selected = facts.filter((fact) => fact.field.startsWith('training.') || fact.field === 'certification');
    if (!selected.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const course = fieldValues(selected, 'training.course')[0] ?? fieldValues(selected, 'certification')[0];
    const institution = fieldValues(selected, 'training.institution')[0]; const status = fieldValues(selected, 'training.status')[0];
    const answer = language === 'english' ? `${name}'s supported training: ${[course, institution, status].filter(Boolean).join(' — ')}.` : `${name} ki supported training: ${[course, institution, status].filter(Boolean).join(' — ')}.`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(selected), structuredAnswerUsed: true };
  }

  if (intent === 'projects') {
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
    return { ...base, status: operation === 'descriptive' ? 'partial' as const : 'answer' as const, answer, explicitFacts: evidence(projectFacts), structuredAnswerUsed: operation !== 'descriptive', ragFallbackUsed: operation === 'descriptive', notAvailableReason: operation === 'descriptive' ? 'Project descriptions may need supporting chunk context.' : null };
  }

  if (intent === 'technology') {
    const techRelations = relationships.filter((relationship) => (relationship.relation ?? relationship.relationshipType) === 'USES_TECHNOLOGY');
    const techIds = new Set(techRelations.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)));
    const names = bundle.targets.filter((target) => techIds.has(id(target._id)) && target.entityType === 'technology').map((target) => target.canonicalName);
    if (!names.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const answer = language === 'english' ? `${name} works with ${join(names, language)}.` : `${name} ${join(names, language)} par kaam karte hain.`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: [], structuredAnswerUsed: true };
  }

  if (intent === 'contact') {
    const candidates = fields.length ? facts.filter((fact) => fields.includes(fact.field)) : facts.filter((fact) => /(?:email|phone|url|contact)/.test(fact.field));
    if (!candidates.length) return { ...base, status: 'none' as const, notAvailableReason: unavailableReason(intent) };
    const answer = language === 'english' ? `${name}'s supported contact details:\n${candidates.map((fact) => `- ${fact.field}: ${text(fact.value)}`).join('\n')}` : `${name} ki supported contact details:\n${candidates.map((fact) => `- ${fact.field}: ${text(fact.value)}`).join('\n')}`;
    return { ...base, status: 'answer' as const, answer, explicitFacts: evidence(candidates), structuredAnswerUsed: true };
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
  const entity = input.entityId ? await KnowledgeEntity.findById(input.entityId).select('canonicalName entityType').lean() as unknown as EntityRecord | null : null;
  if (!entity) return { entity: null, facts: [], relationships: [], targets: [], targetFacts: [], sources: [] };
  const [facts, relationships] = await Promise.all([
    KnowledgeFact.find({ entityId: input.entityId, status: 'active', isConflicting: { $ne: true } }).lean() as unknown as Promise<FactRecord[]>,
    KnowledgeRelationship.find({ sourceEntityId: input.entityId, isConflicting: { $ne: true } }).lean() as unknown as Promise<RelationshipRecord[]>,
  ]);
  const targetIds = unique(relationships.map((relationship) => id(relationship.objectEntityId ?? relationship.targetEntityId)).filter(Boolean));
  const targets = targetIds.length ? await KnowledgeEntity.find({ _id: { $in: targetIds } }).select('canonicalName entityType').lean() as unknown as EntityRecord[] : [];
  const targetFacts = targetIds.length ? await KnowledgeFact.find({ entityId: { $in: targetIds }, status: 'active', isConflicting: { $ne: true } }).lean() as unknown as FactRecord[] : [];
  const evidenceRecords = [...facts, ...relationships, ...targetFacts];
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
  return { entity, facts: keep(facts), relationships: keep(relationships), targets, targetFacts: keep(targetFacts), sources };
}

/** Queries only stored, source-backed facts and relationships. It never calls an LLM. */
export async function queryStructuredFacts(input: QueryInput): Promise<StructuredFactQueryResult> {
  const bundle = await loadRecords(input);
  const result = answerFor({ query: input.query, fields: input.requestedFields, language: input.language, bundle });
  return { ...result, sources: result.explicitFacts.length || result.relationshipsFound ? bundle.sources : [] };
}

export const structuredFactTesting = { answerFor };
