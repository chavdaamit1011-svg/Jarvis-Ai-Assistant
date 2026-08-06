import type { BenchmarkResult } from './benchmark-types';
const rate = (values: boolean[]) => values.length ? values.filter(Boolean).length / values.length : 0;
export function calculateMetrics(results: BenchmarkResult[]) {
  const byCategory = new Map<string, BenchmarkResult[]>(); results.forEach((result) => byCategory.set(result.test.category, [...(byCategory.get(result.test.category) ?? []), result]));
  const categoryScores = [...byCategory.entries()].map(([category, values]) => ({ category, score: rate(values.map((value) => value.pass)) }));
  const checks = (name: string) => results.map((result) => result.checks[name] ?? false);
  const overallScore = rate(results.map((result) => result.pass));
  return { retrievalPrecision: rate(checks('sourceCount')), retrievalRecall: rate(checks('sourceCount')), entityAccuracy: rate(checks('entities')), factAccuracy: rate(checks('facts')), relationshipAccuracy: rate(checks('relationships')), sourceAccuracy: rate(checks('sourceCount')), exactUrlAccuracy: rate(results.filter((result) => result.test.category === 'Exact URL lookup').map((result) => result.checks.answer)), hallucinationRate: 1 - rate(results.filter((result) => result.test.expectedAnswerSource !== 'general-ai').map((result) => result.checks.answer)), fallbackAccuracy: rate(results.filter((result) => result.test.expectedAnswerSource === 'general-ai').map((result) => result.checks.answerSource)), averageResponseTime: results.length ? results.reduce((sum, result) => sum + result.actual.latencyMs, 0) / results.length : 0, overallScore, strongestCategory: categoryScores.sort((a,b) => b.score-a.score)[0]?.category ?? 'n/a', weakestCategory: categoryScores.sort((a,b) => a.score-b.score)[0]?.category ?? 'n/a' };
}
