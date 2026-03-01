import { google } from '@ai-sdk/google';

/**
 * Text generation model used across all agents (research, writing, etc.).
 *
 * Switch providers by changing this single line:
 *   google('gemini-2.5-flash')                   ← current (cheapest tier)
 *   google('gemini-2.0-flash')                   ← even cheaper, slightly less capable
 *   openai('gpt-4o-mini')                        ← requires @ai-sdk/openai
 *   anthropic('claude-3-5-haiku-latest')          ← requires @ai-sdk/anthropic
 */
export const textModel = google('gemini-2.5-flash');

/**
 * Embedding model — must match the dimensionality stored in pgvector.
 * Changing this model requires re-indexing all existing sections.
 */
export const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
