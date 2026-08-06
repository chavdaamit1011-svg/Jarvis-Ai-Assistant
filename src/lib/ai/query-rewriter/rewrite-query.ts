import { semanticQueryRewriteSchema } from './query-rewriter-schema';
import type { QueryRewriteResult, QueryRewriterInput, ResolvedRetrievalEntity, SemanticQueryRewriter } from './query-rewriter-types';

const MAX_QUERY_LENGTH = 4_000;
const MAX_ALTERNATES = 6;

function entityName(entity: ResolvedRetrievalEntity | undefined) {
  if (typeof entity === 'string') return entity.trim() || null;
  return entity?.name.trim() || null;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getExactTerms(query: string, entity: string | null) {
  const urls = query.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  const emails = query.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi) ?? [];
  const numbers = query.match(/\b\d+(?:[.,]\d+)?(?:%|(?=\b))/g) ?? [];
  // Preserve common code/technology notation such as Next.js, C++, and C#.
  const technicalTerms = query.match(/\b[\p{L}\d]+(?:\.[\p{L}\d]+|\+\+|#)\b/gu) ?? [];
  return unique([...(entity ? [entity] : []), ...urls, ...emails, ...numbers, ...technicalTerms]);
}

function preserveExactTerms(query: string, exactTerms: string[]) {
  let preserved = query.trim();
  for (const term of exactTerms) {
    if (!preserved.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      preserved = `${preserved} ${term}`.trim();
    }
  }
  return preserved.slice(0, 500);
}

function fallback(input: QueryRewriterInput, exactTerms: string[]): QueryRewriteResult {
  const primaryQuery = input.originalQuery.trim();
  return {
    primaryQuery,
    alternateQueries: [],
    semanticConcepts: [],
    exactTerms,
    confidence: 0.35,
    trace: {
      originalQuery: input.originalQuery,
      rewrittenQueries: [primaryQuery],
      semanticConcepts: [],
      rewriterConfidence: 0.35,
      fallbackUsed: true,
    },
  };
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Query rewriter timed out.')), timeoutMs)),
  ]);
}

/**
 * Produces retrieval terms only. It deliberately has no access to MongoDB,
 * embeddings, chunks, or answer formatting.
 */
export async function rewriteKnowledgeQuery(
  input: QueryRewriterInput,
  options: { rewriter?: SemanticQueryRewriter; timeoutMs?: number } = {},
): Promise<QueryRewriteResult> {
  if (!input.originalQuery?.trim()) throw new Error('A query is required for semantic rewriting.');
  if (input.originalQuery.length > MAX_QUERY_LENGTH) throw new Error(`Query must be ${MAX_QUERY_LENGTH} characters or fewer.`);

  const resolvedName = entityName(input.resolvedEntity);
  const exactTerms = getExactTerms(input.originalQuery, resolvedName);
  const primaryQuery = input.originalQuery.trim();
  // Lazy loading keeps this pure coordinator testable without loading the
  // Next-only server marker. The actual Groq adapter remains server-only.
  const runRewriter: SemanticQueryRewriter = options.rewriter ?? (async (value) => {
    const { rewriteWithGroq } = await import('./groq-query-rewriter');
    return rewriteWithGroq(value);
  });

  // One retry; both failures safely leave retrieval on the original query.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const candidate = semanticQueryRewriteSchema.parse(await withTimeout(
        runRewriter({ ...input, entityName: resolvedName, exactTerms }),
        options.timeoutMs ?? 2_500,
      ));
      const alternateQueries = unique(candidate.alternateQueries)
        .filter((query) => query.localeCompare(primaryQuery, undefined, { sensitivity: 'accent' }) !== 0)
        .map((query) => preserveExactTerms(query, exactTerms))
        .slice(0, MAX_ALTERNATES);

      if (alternateQueries.length < 3) throw new Error('Semantic rewriter returned too few distinct queries.');
      return {
        primaryQuery,
        alternateQueries,
        semanticConcepts: unique(candidate.semanticConcepts),
        exactTerms,
        confidence: candidate.confidence,
        trace: {
          originalQuery: input.originalQuery,
          rewrittenQueries: [primaryQuery, ...alternateQueries],
          semanticConcepts: unique(candidate.semanticConcepts),
          rewriterConfidence: candidate.confidence,
          fallbackUsed: false,
        },
      };
    } catch {
      // The retry is intentionally silent; the caller receives a safe fallback.
    }
  }

  return fallback(input, exactTerms);
}
