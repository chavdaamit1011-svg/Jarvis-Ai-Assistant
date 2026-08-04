import 'server-only';

import { getEmbeddingModel } from './embedding-model';
import { EmbeddingError } from './types';

export interface EmbeddingProvider {
  readonly id: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new EmbeddingError('The provider returned an invalid embedding vector.', 'INFERENCE');
  }
  return values.map((value) => value / magnitude);
}

/** Local Transformers.js implementation; future OpenAI, Gemini, or hosted HF providers share this interface. */
export const localHuggingFaceEmbeddingProvider: EmbeddingProvider = {
  id: 'huggingface-local-minilm',
  async generateEmbedding(text) {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  },
  async generateEmbeddings(texts) {
    try {
      const model = await getEmbeddingModel();
      const output = await model(texts, { pooling: 'mean', normalize: true });
      const values = Array.from(output.data, Number);
      if (!values.length || values.length % texts.length !== 0) {
        throw new EmbeddingError('The provider returned an unexpected embedding shape.', 'INFERENCE');
      }
      const dimension = values.length / texts.length;
      return texts.map((_, index) => normalizeVector(values.slice(index * dimension, (index + 1) * dimension)));
    } catch (error: unknown) {
      if (error instanceof EmbeddingError) throw error;
      console.error('[Embeddings] Provider inference failed:', error);
      throw new EmbeddingError('The local embedding provider could not generate an embedding.', 'INFERENCE');
    }
  },
};

export const embeddingProvider = localHuggingFaceEmbeddingProvider;
