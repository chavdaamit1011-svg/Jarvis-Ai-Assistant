import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructuredKnowledge } from './structured-knowledge-extractor';

test('preserves separate sections and atomic resume facts', () => {
  const result = extractStructuredKnowledge('Name: Mira Patel\nEDUCATION\nBachelor of Commerce\nMaster of Computer Application\nSKILLS\nReact.js, Node.js\nPROJECTS\nE-Commerce (Northern Market)');
  assert.deepEqual(result.sections.map((section) => section.heading), ['', 'EDUCATION', 'SKILLS', 'PROJECTS']);
  assert.ok(result.facts.some((fact) => fact.field === 'education.degree' && fact.value === 'Bachelor of Commerce'));
  assert.ok(result.facts.some((fact) => fact.field === 'education.degree_alias' && fact.value === 'MCA'));
  assert.equal(result.facts.filter((fact) => fact.field === 'skill').length, 2);
});

test('extracts atomic profile education, location, training, and exactly bounded projects', () => {
  const content = `AMIT SAMPLE
Ahmedabad | Gujarat | +91-9998320342 | person@example.com
PROFESSIONAL SUMMARY
Monark University
Master of Computer Application 2025 - 2027
Pursuing Master of Computer Application from Monark University.
EDUCATION
RELEVANT EXPERIENCE
Fresher
Bachelor of Commerce
I have pursued Bachelor of Commerce from Monark University with First Class grade.
2021 – 2024
TECHNICAL & SOFT SKILLS
Languages Known: Java Script | PHP
Frontend: HTML | CSS | Bootstrap | React.js
Backend: Node.js | Express.js | MongoDB
PROJECT WORK
E-Commerce (Sugar Cosmetics)
Built a responsive e-commerce UI with product listing using HTML, CSS, JS. Added Add to Cart, Login/Signup, Wishlist, and Purchase flow functionality.
Link | https://cosmetic.example/
E-Commerce (Kisah Wear)
Created an E-commerce website using React.js with reusable components, state management, and API integration.
Link | https://kisah.example/
E-Commerce (The Dark Store)
Created The Dark Store E-commerce website using Node.js and MongoDB, featuring secure login, product catalog management, and scalable backend architecture.
CERTIFICATION
Attending IT full stack web development course from Red & White Multimedia Education.`;
  const result = extractStructuredKnowledge(content);
  const values = result.facts.map((fact) => String(fact.value));
  for (const expected of ['Ahmedabad', 'Gujarat', 'Bachelor of Commerce', 'B.Com', 'Monark University', 'First Class', '2021', '2024', 'Master of Computer Application', 'MCA', '2025', '2027', 'pursuing', 'Fresher', 'IT full stack web development course', 'Red & White Multimedia Education', 'attending']) assert.ok(values.includes(expected), expected);
  assert.equal(result.entities.filter((entity) => entity.entityType === 'project').length, 3);
  assert.equal(result.facts.some((fact) => fact.field === 'project' && /Wishlist|and API|product/.test(String(fact.value))), false);
  assert.equal(result.facts.some((fact) => fact.field === 'training.course' && /Master of Computer/i.test(String(fact.value))), false);
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'STUDIED_AT'));
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'ATTENDING_COURSE'));
});

test('extracts product, policy, contact and exact URL values without inference', () => {
  const result = extractStructuredKnowledge('Company: Alpine Goods\nPOLICIES\nRefund Policy: Refunds are accepted within 30 days.\nPRODUCTS\nTravel Bag, Winter Jacket\nCONTACT\nEmail: support@alpine.example\nWebsite: https://Alpine.example/Support');
  const values = result.facts.map((fact) => fact.value);
  assert.ok(values.includes('Refunds are accepted within 30 days'));
  assert.ok(values.includes('Travel Bag'));
  assert.ok(values.includes('Winter Jacket'));
  assert.ok(values.includes('https://Alpine.example/Support'));
  assert.equal(values.includes('Unknown phone number'), false);
});

test('stores explicit relationships with supporting source text', () => {
  const result = extractStructuredKnowledge('Neel Desai is a Flutter Developer at BlueOrbit Labs.\nNeel created the OrbitPay mobile application.');
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'WORKS_AT' && relationship.sourceText.includes('BlueOrbit Labs')));
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'CREATED' && relationship.sourceText.includes('OrbitPay')));
});
