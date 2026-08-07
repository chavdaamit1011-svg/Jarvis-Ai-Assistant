import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRequestedField } from '@/lib/ai/query-understanding/field-normalization';
import { structuredFactTesting } from './query-engine';

const fact = (field: string, value: string, section = 'section-1') => ({
  _id: `${field}-${value}`,
  entityId: 'person-1',
  field,
  value,
  documentId: 'document-1',
  chunkId: 'chunk-1',
  sourceDocumentId: 'document-1',
  sourceChunkId: 'chunk-1',
  sourceSectionId: section,
  sourceText: `${field}: ${value}`,
  confidence: 1,
  status: 'active',
});

const bundle = () => ({
  entity: { _id: 'person-1', canonicalName: 'Example Person', entityType: 'person' },
  facts: [
    fact('location.city', 'Surat', 'identity'), fact('location.state', 'Gujarat', 'identity'),
    fact('education.degree', 'Bachelor of Commerce', 'education-1'), fact('education.degree_alias', 'B.Com', 'education-1'), fact('education.institution', 'Example University', 'education-1'), fact('education.start_year', '2021', 'education-1'), fact('education.end_year', '2024', 'education-1'), fact('education.status', 'completed', 'education-1'),
    fact('education.degree', 'Master of Computer Application', 'education-2'), fact('education.degree_alias', 'MCA', 'education-2'), fact('education.institution', 'Example University', 'education-2'), fact('education.start_year', '2025', 'education-2'), fact('education.end_year', '2027', 'education-2'), fact('education.status', 'pursuing', 'education-2'),
    fact('training.course', 'IT Full Stack Web Development', 'training'), fact('training.institution', 'Example Training Institute', 'training'), fact('training.status', 'attending', 'training'),
  ],
  relationships: [
    { _id: 'rel-1', sourceEntityId: 'person-1', targetEntityId: 'project-1', relationshipType: 'WORKED_ON', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Built Storefront One', confidence: 1 },
    { _id: 'rel-2', sourceEntityId: 'person-1', targetEntityId: 'project-2', relationshipType: 'WORKED_ON', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Built Storefront Two', confidence: 1 },
    { _id: 'rel-3', sourceEntityId: 'person-1', targetEntityId: 'project-3', relationshipType: 'WORKED_ON', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Built Storefront Three', confidence: 1 },
    { _id: 'tech-1', sourceEntityId: 'person-1', targetEntityId: 'tech-1', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Languages Known: JavaScript | PHP', confidence: 1 },
    { _id: 'tech-2', sourceEntityId: 'person-1', targetEntityId: 'tech-2', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Languages Known: JavaScript | PHP', confidence: 1 },
    { _id: 'tech-3', sourceEntityId: 'person-1', targetEntityId: 'tech-3', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Frontend: HTML | CSS | Bootstrap | React.js', confidence: 1 },
    { _id: 'tech-4', sourceEntityId: 'person-1', targetEntityId: 'tech-4', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Frontend: HTML | CSS | Bootstrap | React.js', confidence: 1 },
    { _id: 'tech-5', sourceEntityId: 'person-1', targetEntityId: 'tech-5', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Frontend: HTML | CSS | Bootstrap | React.js', confidence: 1 },
    { _id: 'tech-6', sourceEntityId: 'person-1', targetEntityId: 'tech-6', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Frontend: HTML | CSS | Bootstrap | React.js', confidence: 1 },
    { _id: 'tech-7', sourceEntityId: 'person-1', targetEntityId: 'tech-7', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Backend: Node.js | Express.js | MongoDB', confidence: 1 },
    { _id: 'tech-8', sourceEntityId: 'person-1', targetEntityId: 'tech-8', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Backend: Node.js | Express.js | MongoDB', confidence: 1 },
    { _id: 'tech-9', sourceEntityId: 'person-1', targetEntityId: 'tech-9', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Backend: Node.js | Express.js | MongoDB', confidence: 1 },
  ],
  projectRelationships: [
    { _id: 'project-tech-1', sourceEntityId: 'project-1', targetEntityId: 'tech-1', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Storefront One uses JavaScript', confidence: 1 },
    { _id: 'project-tech-2', sourceEntityId: 'project-2', targetEntityId: 'tech-6', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Storefront Two uses React.js', confidence: 1 },
    { _id: 'project-tech-3', sourceEntityId: 'project-3', targetEntityId: 'tech-9', relationshipType: 'USES_TECHNOLOGY', documentId: 'document-1', chunkId: 'chunk-1', sourceDocumentId: 'document-1', sourceChunkId: 'chunk-1', sourceText: 'Storefront Three uses MongoDB', confidence: 1 },
  ],
  targets: [
    { _id: 'project-1', canonicalName: 'Storefront One', entityType: 'project' },
    { _id: 'project-2', canonicalName: 'Storefront Two', entityType: 'project' },
    { _id: 'project-3', canonicalName: 'Storefront Three', entityType: 'project' },
    { _id: 'tech-1', canonicalName: 'JavaScript', entityType: 'technology' },
    { _id: 'tech-2', canonicalName: 'PHP', entityType: 'technology' },
    { _id: 'tech-3', canonicalName: 'HTML', entityType: 'technology' },
    { _id: 'tech-4', canonicalName: 'CSS', entityType: 'technology' },
    { _id: 'tech-5', canonicalName: 'Bootstrap', entityType: 'technology' },
    { _id: 'tech-6', canonicalName: 'React.js', entityType: 'technology' },
    { _id: 'tech-7', canonicalName: 'Node.js', entityType: 'technology' },
    { _id: 'tech-8', canonicalName: 'Express.js', entityType: 'technology' },
    { _id: 'tech-9', canonicalName: 'MongoDB', entityType: 'technology' },
  ],
  targetFacts: [
    { ...fact('description', 'A supported storefront project.'), entityId: 'project-1' },
    { ...fact('project_url', 'https://example.test/one'), entityId: 'project-1' },
    { ...fact('description', 'A React storefront project.'), entityId: 'project-2' },
    { ...fact('project_url', 'https://example.test/two'), entityId: 'project-2' },
    { ...fact('description', 'A MongoDB storefront project.'), entityId: 'project-3' },
  ],
  sources: [],
});

const query = (text: string, fields: string[] = []) => structuredFactTesting.answerFor({ query: text, fields, language: 'english', bundle: bundle() });

test('answers degree years, status, institution, and counts from atomic education facts', () => {
  assert.match(query('B.Com kis year me kiya?', ['education']).answer ?? '', /2021[-–]2024/);
  assert.match(query('What is the education status?', ['education']).answer ?? '', /completed/);
  assert.match(query('Which university did they attend?', ['education']).answer ?? '', /Example University/);
  assert.match(query('Kitni degrees hain?', ['education']).answer ?? '', /2 supported education records/);
});

test('recognizes a credential abbreviation in the original live-query wording', () => {
  const originalQuery = 'chavda amit ne bcom kis year me kiya';
  assert.deepEqual(normalizeRequestedField(originalQuery).requestedFields, ['education']);
  const result = query(originalQuery, ['education']);
  assert.equal(result.status, 'answer');
  assert.match(result.answer ?? '', /Bachelor of Commerce/);
  assert.match(result.answer ?? '', /2021[-–]2024/);
});

test('answers project count/list, location, and training without a chunk dump', () => {
  assert.match(query('Total projects kitne hain?', ['projects']).answer ?? '', /3 documented projects/);
  assert.match(query('List the projects', ['projects']).answer ?? '', /Storefront Three/);
  assert.equal(query('Kahan rehta hai?', ['location']).answer, "Example Person's stored location is Surat, Gujarat.");
  assert.match(query('Which certificate course is attending?', ['certifications']).answer ?? '', /IT Full Stack Web Development/);
});

test('returns final unavailable for an absent exact personal field and keeps safe MCA inference marked separately', () => {
  const missing = query('What is the birth date?');
  assert.equal(missing.status, 'none');
  assert.equal(missing.finalUnavailable, true);
  const mca = query('What field is MCA related to?', ['education']);
  assert.ok(mca.inferredFacts.some((value) => /IT-related/.test(value)));
});

test('does not send an unsupported personal field to RAG', () => {
  const result = query('What is the salary?', []);
  assert.equal(result.status, 'none');
  assert.equal(result.finalUnavailable, true);
  assert.equal(result.ragFallbackUsed, false);
});

test('returns only stored project descriptions for descriptive project questions', () => {
  const result = query('Tell me about the projects', ['projects']);
  assert.equal(result.status, 'answer');
  assert.equal(result.ragFallbackUsed, false);
  assert.match(result.answer ?? '', /Storefront One/);
});

test('projects canonical subfields before composing structured technology answers', () => {
  const backend = query('Amit ko backend me kya aata hai?', ['technologies']);
  assert.match(backend.answer ?? '', /Node\.js, Express\.js and MongoDB/);
  assert.doesNotMatch(backend.answer ?? '', /React\.js|JavaScript/);
  assert.equal(backend.subfield, 'backend');
  assert.deepEqual(backend.projection, ['technology.backend']);

  const frontend = query('Amit ki frontend skills?', ['skills']);
  assert.match(frontend.answer ?? '', /HTML, CSS, Bootstrap and React\.js/);
  assert.doesNotMatch(frontend.answer ?? '', /Node\.js|MongoDB/);

  const languages = query('Amit ko kaunsi languages aati hain?', ['skills']);
  assert.match(languages.answer ?? '', /JavaScript and PHP/);
  assert.doesNotMatch(languages.answer ?? '', /HTML|Node\.js/);
});

test('filters education by current and completed state before answer projection', () => {
  const current = query('Wo abhi kaunsi degree pursue kar raha hai?', ['education']);
  assert.match(current.answer ?? '', /Master of Computer Application/);
  assert.doesNotMatch(current.answer ?? '', /Bachelor of Commerce/);
  assert.deepEqual(current.filters.status, ['pursuing', 'active', 'attending']);

  const completed = query('Usne kaunsi degree complete ki?', ['education']);
  assert.match(completed.answer ?? '', /Bachelor of Commerce/);
  assert.doesNotMatch(completed.answer ?? '', /Master of Computer Application/);

  const all = query('Uski sari education batao', ['education']);
  assert.match(all.answer ?? '', /Bachelor of Commerce/);
  assert.match(all.answer ?? '', /Master of Computer Application/);
});

test('uses generic intent typo normalization without entity-specific question rules', () => {
  const profile = query('whi is Example Person');
  assert.equal(profile.status, 'answer');
  assert.equal(profile.semanticConcept, 'profile');
});

test('strictly applies project count, URL, entity, and technology projections', () => {
  const count = query('How many projects does Example Person have?', ['projects']);
  assert.equal(count.answer, 'Example Person has 3 documented projects.');
  assert.doesNotMatch(count.answer ?? '', /Storefront One/);

  const urls = query('Give me the projects link only', ['projects']);
  assert.equal(urls.answer, 'https://example.test/one\nhttps://example.test/two');
  assert.equal(urls.outputMode, 'values_only');

  const namedUrl = query('Give me the Storefront Two project link', ['projects']);
  assert.equal(namedUrl.answer, 'https://example.test/two');
  assert.deepEqual(namedUrl.matchedProjectEntities, ['Storefront Two']);

  const react = query('In which project did Example Person use React?', ['projects']);
  assert.equal(react.answer, 'Storefront Two');
  assert.doesNotMatch(react.answer ?? '', /Storefront One|Storefront Three/);

  const mongo = query('MongoDB kis project me use kiya?', ['projects']);
  assert.equal(mongo.answer, 'Storefront Three');
});

test('executes the supplied canonical plan instead of reclassifying the raw wording', () => {
  const result = structuredFactTesting.answerFor({
    query: 'unrelated natural-language wording',
    fields: ['education'],
    language: 'english',
    bundle: bundle(),
    plan: {
      concept: 'education', operation: 'lookup', filters: { state: 'current' },
      projection: ['education.degree'], outputMode: 'only_requested_fields', references: [],
    },
  });
  assert.equal(result.status, 'answer');
  assert.match(result.answer ?? '', /Master of Computer Application/);
  assert.doesNotMatch(result.answer ?? '', /Bachelor of Commerce/);
  assert.deepEqual(result.filters.status, ['pursuing', 'active', 'attending']);
});
