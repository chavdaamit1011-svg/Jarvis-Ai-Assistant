import 'server-only';

import { getEmbeddingModel } from './embedding-model';
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

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new EmbeddingError('The model returned an invalid embedding vector.', 'INFERENCE');
  }
  return values.map((value) => value / magnitude);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_EMBEDDING_BATCH_SIZE) {
    throw new EmbeddingError(`A maximum of ${MAX_EMBEDDING_BATCH_SIZE} texts can be embedded at once.`, 'INPUT');
  }

  const inputs = texts.map(validateText);
  try {
    const model = await getEmbeddingModel();
    const output = await model(inputs, { pooling: 'mean', normalize: true });
    const values = Array.from(output.data, Number);
    if (values.length === 0 || values.length % inputs.length !== 0) {
      throw new EmbeddingError('The model returned an unexpected embedding shape.', 'INFERENCE');
    }

    const dimension = values.length / inputs.length;
    return inputs.map((_, index) => normalizeVector(values.slice(index * dimension, (index + 1) * dimension)));
  } catch (error: unknown) {
    if (error instanceof EmbeddingError) throw error;
    console.error('[Embeddings] Inference failed:', error);
    throw new EmbeddingError('The local embedding model could not generate an embedding.', 'INFERENCE');
  }
}
