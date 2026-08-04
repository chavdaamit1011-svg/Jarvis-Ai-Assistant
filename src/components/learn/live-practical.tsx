'use client';

import { TokenizerPractical } from '@/app/playground/tokenizer/page';
import { EmbeddingPractical } from '@/app/embedding-test/page';
import { RagPlayground } from './rag-playground';

export function LivePractical({ slug }: { slug: string }) {
  if (slug === 'tokenization') return <TokenizerPractical />;
  if (slug === 'embeddings') return <EmbeddingPractical />;
  if (slug === 'rag') return <RagPlayground />;
  return <div className="rounded-xl border border-dashed border-[var(--border-color)] p-6 text-sm text-[var(--text-secondary)]">Live practical is planned for this topic. Jarvis does not show mock results as a substitute for a working feature.</div>;
}
