import { calculateMetrics } from './metrics';
import type { BenchmarkActual, BenchmarkCase, BenchmarkReport, BenchmarkResult } from './benchmark-types';

export type BenchmarkExecutor = (test: BenchmarkCase) => Promise<BenchmarkActual>;
const normal = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const includesAll = (text: string, values: string[]) => values.every((value) => normal(text).includes(normal(value)));

function compare(test: BenchmarkCase, actual: BenchmarkActual): BenchmarkResult {
  const checks = {
    answer: !test.expectedAnswer || normal(actual.answer).includes(normal(test.expectedAnswer)),
    answerSource: actual.answerSource === test.expectedAnswerSource,
    entities: !test.expectedEntities.length || includesAll(actual.answer, test.expectedEntities),
    facts: !test.expectedFacts.length || includesAll(actual.answer, test.expectedFacts.map((fact) => fact.replace(/_/g, ' '))),
    relationships: !test.expectedRelationships.length || test.expectedRelationships.every((relationship) => actual.answer.toUpperCase().includes(relationship.replace(/_/g, ' ')) || actual.route.includes('knowledge-graph')),
    sourceCount: actual.sourceCount >= test.expectedSourceCount,
    confidence: actual.confidence >= test.expectedConfidence,
  };
  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return { test, actual, pass: !failures.length, checks, failures };
}

export async function runBenchmark(dataset: BenchmarkCase[], execute: BenchmarkExecutor): Promise<BenchmarkReport> {
  const results: BenchmarkResult[] = [];
  for (const test of dataset) results.push(compare(test, await execute(test)));
  const metrics = calculateMetrics(results);
  return { id: `benchmark-${Date.now()}`, createdAt: new Date().toISOString(), results, metrics, summary: { total: results.length, passed: results.filter((result) => result.pass).length, failed: results.filter((result) => !result.pass).length } };
}
