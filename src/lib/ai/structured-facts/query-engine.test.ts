import assert from 'node:assert/strict';
import test from 'node:test';
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
  ],
  targets: [
    { _id: 'project-1', canonicalName: 'Storefront One', entityType: 'project' },
    { _id: 'project-2', canonicalName: 'Storefront Two', entityType: 'project' },
    { _id: 'project-3', canonicalName: 'Storefront Three', entityType: 'project' },
  ],
  targetFacts: [fact('description', 'A supported storefront project.')],
  sources: [],
});

const query = (text: string, fields: string[] = []) => structuredFactTesting.answerFor({ query: text, fields, language: 'english', bundle: bundle() });

test('answers degree years, status, institution, and counts from atomic education facts', () => {
  assert.match(query('B.Com kis year me kiya?', ['education']).answer ?? '', /2021[-–]2024/);
  assert.match(query('What is the education status?', ['education']).answer ?? '', /completed/);
  assert.match(query('Which university did they attend?', ['education']).answer ?? '', /Example University/);
  assert.match(query('Kitni degrees hain?', ['education']).answer ?? '', /2 supported education records/);
});

test('answers project count/list, location, and training without a chunk dump', () => {
  assert.match(query('Total projects kitne hain?', ['projects']).answer ?? '', /3 supported projects/);
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

test('uses RAG only as a partial supplement for descriptive project questions', () => {
  const result = query('Tell me about the projects', ['projects']);
  assert.equal(result.status, 'partial');
  assert.equal(result.ragFallbackUsed, true);
  assert.match(result.answer ?? '', /Storefront One/);
});
