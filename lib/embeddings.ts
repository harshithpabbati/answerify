import { GoogleGenAI } from '@google/genai';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

export { EMBEDDING_DIMENSIONS };

/**
 * Serialise an embedding vector into the string format expected by pgvector
 * (e.g. `[0.1,0.2,0.3]`).
 */
export function serializeEmbedding(values: number[]): string {
  return `[${values.join(',')}]`;
}

/**
 * Generate embedding vectors for one or more text inputs using Gemini.
 * Returns a flat array when given a single string, or a 2D array for
 * multiple strings.
 */
export async function generateEmbedding(
  ai: GoogleGenAI,
  text: string,
): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return result.embeddings?.[0]?.values ?? [];
}

/**
 * Generate embedding vectors for multiple text inputs in a single request.
 */
export async function generateEmbeddings(
  ai: GoogleGenAI,
  texts: string[],
): Promise<number[][]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return result.embeddings?.map((e) => e.values ?? []) ?? [];
}
