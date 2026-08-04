import 'server-only';

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EmbeddingError } from './types';

export const EMBEDDING_MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX';
export const EMBEDDING_DIMENSION = 384;

let embeddingModelPromise: Promise<FeatureExtractionPipeline> | null = null;

/** Lazily loads one process-local model instance. It is never initialized at build time. */
export function getEmbeddingModel(): Promise<FeatureExtractionPipeline> {
  if (!embeddingModelPromise) {
    embeddingModelPromise = pipeline('feature-extraction', EMBEDDING_MODEL_ID)
      .then((model) => model as FeatureExtractionPipeline)
      .catch((error: unknown) => {
        embeddingModelPromise = null;
        console.error('[Embeddings] Model initialization failed:', error);
        throw new EmbeddingError('The local embedding model could not be initialized.', 'INITIALIZATION');
      });
  }

  return embeddingModelPromise;
}
