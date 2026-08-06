import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSupportedProjects } from './project-facts';
import type { RetrievedChunk } from './rag-types';

const chunk = (content: string): RetrievedChunk => ({ documentId: 'doc-1', chunkId: 'chunk-1', documentTitle: 'Resume', chunkIndex: 0, content, score: 1, visibility: 'public' });

test('does not infer a microservice project from Node.js skills', () => {
  assert.equal(extractSupportedProjects([chunk('SKILLS\nNode.js | Express.js | MongoDB')]).length, 0);
});

test('does not infer an ML project from AI skills', () => {
  assert.equal(extractSupportedProjects([chunk('SKILLS\nAI | RAG | Embeddings')]).length, 0);
});

test('returns only explicitly named project records and preserves exact URL', () => {
  const projects = extractSupportedProjects([chunk('PROJECT WORK\nE-Commerce (Sugar Cosmetics)\nBuilt responsive product listing UI using HTML, CSS, JS.\nhttps://sugar.example/app/\nE-Commerce (The Dark Store)\nCreated an e-commerce website using Node.js and MongoDB.')]);
  assert.deepEqual(projects.map((project) => project.projectName), ['E-Commerce (Sugar Cosmetics)', 'E-Commerce (The Dark Store)']);
  assert.equal(projects[0].projectUrl, 'https://sugar.example/app/');
  assert.equal(projects[0].chunkId, 'chunk-1');
  assert.ok(projects[0].supportingText.includes('Sugar Cosmetics'));
});
