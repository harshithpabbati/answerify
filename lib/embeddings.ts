import { embed, embedMany } from 'ai';

import { embeddingModel } from '@/lib/ai';

export const EMBEDDING_DIMENSIONS = 768;

const providerOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS },
};

/**
 * Serialise an embedding vector into the string format expected by pgvector
 * (e.g. `[0.1,0.2,0.3]`).
 */
export function serializeEmbedding(values: number[]): string {
  return `[${values.join(',')}]`;
}

/**
 * Generate an embedding vector for a single text input.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions,
  });
  return embedding;
}

/**
 * Generate embedding vectors for multiple text inputs in a single request.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions,
  });
  return embeddings;
}
