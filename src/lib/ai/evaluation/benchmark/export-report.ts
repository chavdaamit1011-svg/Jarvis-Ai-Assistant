import type { BenchmarkReport } from './benchmark-types';
export function exportBenchmarkReport(report: BenchmarkReport, format: 'json' | 'csv' | 'markdown') {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'csv') return ['id,category,question,pass,answerSource,confidence,latencyMs,failures', ...report.results.map((result) => [result.test.id, result.test.category, result.test.question, result.pass, result.actual.answerSource, result.actual.confidence, result.actual.latencyMs, result.failures.join('|')].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
  return [`# Jarvis RAG Benchmark`, `Overall score: ${(report.metrics.overallScore * 100).toFixed(1)}%`, `Hallucination rate: ${(report.metrics.hallucinationRate * 100).toFixed(1)}%`, `Average latency: ${report.metrics.averageResponseTime.toFixed(0)} ms`, '', '| ID | Category | Result |', '|---|---|---|', ...report.results.map((result) => `| ${result.test.id} | ${result.test.category} | ${result.pass ? 'PASS' : 'FAIL'} |`)].join('\n');
}
