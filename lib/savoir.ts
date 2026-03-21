import { createSavoir } from '@savoir/sdk';

/**
 * Creates AI SDK-compatible tools powered by the Savoir sandbox.
 *
 * Returns `undefined` when `SAVOIR_API_URL` is not configured, so callers can
 * safely skip tool injection at runtime without crashing.
 *
 * Environment variables:
 *   SAVOIR_API_URL  – Base URL of your Savoir knowledge-agent API (required).
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
