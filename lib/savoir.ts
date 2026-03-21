import { createSavoir } from '@savoir/sdk';

/**
 * Creates AI SDK-compatible tools powered by a remote Savoir sandbox.
 *
 * NOTE: This is NOT used for Answerify's own knowledge base, which is stored
 * in Supabase and queried via `makeKnowledgeTools` (see lib/knowledge-tools.ts).
 *
 * Savoir tools (`bash`, `bash_batch`) connect to an external Savoir
 * knowledge-agent server and run shell commands against files hosted there.
 * They are only relevant if you are integrating with a separately deployed
 * Savoir instance (https://github.com/vercel-labs/knowledge-agent-template).
 *
 * Returns `undefined` when `SAVOIR_API_URL` is not configured, so callers can
 * safely skip tool injection at runtime without crashing.
 *
 * Environment variables:
 *   SAVOIR_API_URL  – Base URL of your deployed Savoir knowledge-agent instance.
 *   SAVOIR_API_KEY  – API key for authentication (optional).
 */
export function makeSavoirTools() {
  const apiUrl = process.env.SAVOIR_API_URL;
  if (!apiUrl) return undefined;

  const savoir = createSavoir({
    apiUrl,
    apiKey: process.env.SAVOIR_API_KEY,
  });

  return savoir.tools;
}
