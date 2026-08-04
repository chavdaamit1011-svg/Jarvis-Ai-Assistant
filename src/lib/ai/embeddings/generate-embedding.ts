import 'server-only';

import { embeddingProvider } from './provider';
import { EmbeddingError } from './types';

export const MAX_EMBEDDING_TEXT_LENGTH = 4_000;
export const MAX_EMBEDDING_BATCH_SIZE = 20;

function validateText(text: string): string {
  const normalized = text.trim();
  if (!normalized) throw new EmbeddingError('Text must not be empty.', 'INPUT');
  if (normalized.length > MAX_EMBEDDING_TEXT_LENGTH) {
    throw new EmbeddingError(`Text must be ${MAX_EMBEDDING_TEXT_LENGTH} characters or fewer.`, 'INPUT');
  }
  return normalized;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddingProvider.generateEmbedding(validateText(text));
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_EMBEDDING_BATCH_SIZE) {
    throw new EmbeddingError(`A maximum of ${MAX_EMBEDDING_BATCH_SIZE} texts can be embedded at once.`, 'INPUT');
  }

  const inputs = texts.map(validateText);
  return embeddingProvider.generateEmbeddings(inputs);
}
