import { google } from '@ai-sdk/google';
import { createAiGateway } from 'ai-gateway-provider';
import { createGoogleGenerativeAI as createGatewayGoogleGenerativeAI } from 'ai-gateway-provider/providers/google';

// ---------------------------------------------------------------------------
// Cloudflare AI Gateway (optional)
// Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME to route all text
// generation requests through Cloudflare's AI Gateway for logging and
// observability. CF_AIG_TOKEN is required when using authenticated gateways.
// ---------------------------------------------------------------------------
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfGatewayName = process.env.CLOUDFLARE_GATEWAY_NAME;
const cfAigToken = process.env.CF_AIG_TOKEN;

/**
 * Text generation model used across all agents (research, writing, etc.).
 *
 * When CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME are set, requests
 * are proxied through Cloudflare AI Gateway for logging and observability.
 *
 * Switch providers by changing this single line:
 *   google('gemini-2.5-flash')                   ← current (cheapest tier)
 *   google('gemini-2.0-flash')                   ← even cheaper, slightly less capable
 *   openai('gpt-4o-mini')                        ← requires @ai-sdk/openai
 *   anthropic('claude-3-5-haiku-latest')          ← requires @ai-sdk/anthropic
 */
function buildTextModel() {
  if (cfAccountId && cfGatewayName) {
    const aigateway = createAiGateway({
      accountId: cfAccountId,
      gateway: cfGatewayName,
      ...(cfAigToken && { apiKey: cfAigToken }),
    });
    const gatewayGoogle = createGatewayGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return aigateway(gatewayGoogle('gemini-2.5-flash'));
  }
  return google('gemini-2.5-flash');
}

export const textModel = buildTextModel();

/**
 * Embedding model — must match the dimensionality stored in pgvector.
 * Changing this model requires re-indexing all existing sections.
 */
export const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');
