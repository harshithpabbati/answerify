import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { createAiGateway } from 'ai-gateway-provider';
import { createGoogleGenerativeAI as createGoogle } from 'ai-gateway-provider/providers/google';

// ---------------------------------------------------------------------------
// Cloudflare AI Gateway (optional)
// Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME to route all AI
// requests (text generation and embeddings) through Cloudflare's AI Gateway
// for logging and observability. CF_AIG_TOKEN is required when using
// authenticated gateways.
// ---------------------------------------------------------------------------
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfGatewayName = process.env.CLOUDFLARE_GATEWAY_NAME;
const cfAigToken = process.env.CF_AIG_TOKEN;

const isGatewayEnabled = Boolean(cfAccountId && cfGatewayName);

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
  if (isGatewayEnabled) {
    const aigateway = createAiGateway({
      accountId: cfAccountId!,
      gateway: cfGatewayName!,
      ...(cfAigToken && { apiKey: cfAigToken }),
    });
    const gatewayGoogle = createGoogle({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return aigateway(gatewayGoogle('gemini-2.5-flash'));
  }
  return google('gemini-2.5-flash');
}

/**
 * Embedding model — must match the dimensionality stored in pgvector.
 * Changing this model requires re-indexing all existing sections.
 *
 * When CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME are set, embedding
 * requests are also routed through Cloudflare AI Gateway via a custom base
 * URL (createAiGateway only wraps language models, not embedding models).
 */
function buildEmbeddingModel() {
  if (isGatewayEnabled) {
    // Route embeddings through CF gateway by pointing the base URL at the
    // gateway's Google AI Studio endpoint.
    const provider = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/${cfGatewayName}/google-ai-studio/v1beta`,
      ...(cfAigToken && {
        headers: { 'cf-aig-authorization': `Bearer ${cfAigToken}` },
      }),
    });
    return provider.textEmbeddingModel('gemini-embedding-001');
  }
  return google.textEmbeddingModel('gemini-embedding-001');
}

export const textModel = buildTextModel();
export const embeddingModel = buildEmbeddingModel();
