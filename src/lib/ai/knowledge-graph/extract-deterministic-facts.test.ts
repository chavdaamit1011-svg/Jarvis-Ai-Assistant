import assert from 'node:assert/strict';
import test from 'node:test';
import { extractDeterministicFacts } from './extract-deterministic-facts';

test('extracts a person profile, ownership, and technologies', () => {
  const result = extractDeterministicFacts('Chavda Amit is a Web Developer and owner of Jarvis AI.\nHe works with Next.js, React.js, Node.js and MongoDB.');
  assert.ok(result.entities.some((entity) => entity.name === 'Chavda Amit' && entity.entityType === 'person'));
  assert.ok(result.entities.some((entity) => entity.name === 'Jarvis AI' && entity.entityType === 'product'));
  assert.ok(result.facts.some((fact) => fact.predicate === 'profession' && fact.value === 'Web Developer'));
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'OWNER_OF').length, 1);
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 4);
});

test('extracts company and project labelled fields', () => {
  const result = extractDeterministicFacts('Organization: RC Cyber Europe\nProject: Secure Customer Portal');
  assert.ok(result.entities.some((entity) => entity.entityType === 'organization' && entity.name === 'RC Cyber Europe'));
  assert.ok(result.entities.some((entity) => entity.entityType === 'project' && entity.name === 'Secure Customer Portal'));
});

test('classifies platform URLs and contact fields', () => {
  const result = extractDeterministicFacts('Name: Rahul Sharma\nLinkedIn: https://linkedin.com/in/rahul\nGitHub: https://github.com/rahul\nEmail: rahul@example.com\nPhone: +91 99999 12345');
  assert.deepEqual(result.facts.map((fact) => fact.predicate).sort(), ['email', 'github_url', 'linkedin_url', 'phone']);
});

test('extracts skills list as technology relationships', () => {
  const result = extractDeterministicFacts('Name: Akash Patel\nSkills: JavaScript, TypeScript, React.js and Node.js');
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 4);
});

test('does not turn uncertain technology wording into a relationship', () => {
  const result = extractDeterministicFacts('Name: Amit Sharma\nAmit may use React.js on a future project.');
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 0);
});

test('extracts unseen people, organizations, projects, and explicit relationships', () => {
  const result = extractDeterministicFacts('Neel Desai is a Flutter Developer at BlueOrbit Labs.\nNeel created the OrbitPay mobile application.');
  assert.ok(result.entities.some((entity) => entity.name === 'Neel Desai' && entity.entityType === 'person'));
  assert.ok(result.entities.some((entity) => entity.name === 'BlueOrbit Labs' && entity.entityType === 'organization'));
  assert.ok(result.entities.some((entity) => entity.name === 'OrbitPay' && entity.entityType === 'project'));
  assert.ok(result.facts.some((fact) => fact.predicate === 'profession' && fact.value === 'Flutter Developer'));
  assert.ok(result.relationships.some((relationship) => relationship.relationshipType === 'WORKS_AT'));
  assert.ok(result.relationships.some((relationship) => relationship.relationshipType === 'CREATED'));
});

test('extracts resume project blocks with evidence and project technology relationships', () => {
  const result = extractDeterministicFacts('Name: Neel Desai\nPROJECT WORK\nOrbitPay\nCreated a payment application using Flutter and Firebase.\nhttps://orbitpay.example/');
  const person = result.entities.find((entity) => entity.entityType === 'person' && entity.name === 'Neel Desai');
  const project = result.entities.find((entity) => entity.entityType === 'project' && entity.name === 'OrbitPay');
  assert.ok(person);
  assert.ok(project);
  assert.ok(result.relationships.some((relationship) => relationship.sourceTemporaryId === person?.temporaryId && relationship.targetTemporaryId === project?.temporaryId && relationship.relationshipType === 'WORKED_ON'));
  assert.ok(result.facts.some((fact) => fact.subjectTemporaryId === project?.temporaryId && fact.predicate === 'project_url' && fact.value === 'https://orbitpay.example/'));
});

test('creates separate atomic education and skill facts from an explicit resume section', () => {
  const result = extractDeterministicFacts('Name: Dana Verma\nEDUCATION\nBachelor of Commerce | 2021 - 2024\nMaster of Computer Application | 2025 - 2027\nSKILLS\nTypeScript, React.js, Node.js');
  const education = result.facts.filter((fact) => fact.field?.startsWith('education.'));
  const skills = result.facts.filter((fact) => fact.field === 'skill');
  assert.ok(education.some((fact) => fact.field === 'education.degree' && fact.value === 'Bachelor of Commerce'));
  assert.ok(education.some((fact) => fact.field === 'education.degree_alias' && fact.value === 'B.Com'));
  assert.ok(education.some((fact) => fact.field === 'education.degree' && fact.value === 'Master of Computer Application'));
  assert.ok(education.some((fact) => fact.field === 'education.degree_alias' && fact.value === 'MCA'));
  assert.ok(education.some((fact) => fact.field === 'education.start_year' && fact.value === '2021'));
  assert.ok(education.some((fact) => fact.field === 'education.end_year' && fact.value === '2027'));
  assert.equal(skills.length, 3);
  assert.ok(skills.every((fact) => fact.supportingText === 'TypeScript, React.js, Node.js'));
});

test('extracts bounded project blocks without project fragments or technology leakage', () => {
  const result = extractDeterministicFacts('Name: Dana Verma\nPROJECT WORK\nE-Commerce (First Shop)\nBuilt with HTML, CSS, JS.\nLink | https://first.example/\nE-Commerce (Second Shop)\nCreated using React.js with API integration.\nLink | https://second.example/\nE-Commerce (Third Shop)\nCreated using Node.js and MongoDB.');
  const projects = result.entities.filter((entity) => entity.entityType === 'project');
  assert.equal(projects.length, 3);
  assert.equal(result.facts.filter((fact) => fact.field === 'project').length, 0);
  const first = projects.find((project) => project.name === 'E-Commerce (First Shop)')!;
  const firstTechnologyTargets = result.relationships.filter((relationship) => relationship.sourceTemporaryId === first.temporaryId && relationship.relationshipType === 'USES_TECHNOLOGY');
  const entityById = new Map(result.entities.map((entity) => [entity.temporaryId, entity.name]));
  assert.deepEqual(firstTechnologyTargets.map((relationship) => entityById.get(relationship.targetTemporaryId)).sort(), ['CSS', 'HTML', 'JavaScript']);
});

test('extracts policy, product and service values without assuming missing facts', () => {
  const result = extractDeterministicFacts('Company: Northwind Retail\nRefund Policy: Refunds are accepted within 30 days.\nProducts: Winter Jacket, Travel Bag\nServices: Gift wrapping; Express delivery');
  assert.ok(result.facts.some((fact) => fact.field === 'policy' && fact.value === 'Refunds are accepted within 30 days'));
  assert.deepEqual(result.facts.filter((fact) => fact.field === 'product').map((fact) => fact.value), ['Winter Jacket', 'Travel Bag']);
  assert.deepEqual(result.facts.filter((fact) => fact.field === 'service').map((fact) => fact.value), ['Gift wrapping', 'Express delivery']);
  assert.equal(result.facts.some((fact) => fact.field === 'date_of_birth'), false);
});

test('preserves exact contact values and identifiers with their source lines', () => {
  const result = extractDeterministicFacts('Name: Priya Nair\nEmail: Priya.Nair@Example.com\nPhone: +91 98765 43210\nCustomer ID: CUST-9012\nWebsite: https://Example.com/Profiles/Priya');
  const values = result.facts.map((fact) => fact.value);
  assert.ok(values.includes('Priya.Nair@Example.com'));
  assert.ok(values.includes('+91 98765 43210'));
  assert.ok(values.includes('CUST-9012'));
  assert.ok(values.includes('https://Example.com/Profiles/Priya'));
  assert.ok(result.facts.filter((fact) => values.includes(fact.value as string)).every((fact) => fact.supportingText.length > 0));
});
