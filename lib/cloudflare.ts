import { createHash } from 'crypto';

import { cleanBody } from '@/lib/cleanBody';

export interface CloudflareSearchData {
  content: string;
  filename: string;
  score: number;
}

export interface CloudflareSearchResult {
  data: CloudflareSearchData[];
}

function getCloudflareConfig() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    autoRagName: process.env.CLOUDFLARE_AUTORAG_NAME,
  };
}

/**
 * Query a Cloudflare AutoRAG instance for relevant content chunks scoped to a
 * specific organization. Returns null when Cloudflare credentials are not
 * configured or the request fails so callers can fall back gracefully.
 */
export async function searchAutoRAG(
  query: string,
  organizationId: string,
  maxResults = 5
): Promise<CloudflareSearchResult | null> {
  const { accountId, apiToken, autoRagName } = getCloudflareConfig();

  if (!accountId || !apiToken || !autoRagName) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/autorag/rags/${autoRagName}/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          rewrite_query: true,
          max_num_results: maxResults,
          // Scope results to this organization's indexed content only
          filters: { organization_id: organizationId },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        'Cloudflare AutoRAG search failed:',
        response.status,
        await response.text()
      );
      return null;
    }

    const json = await response.json();
    const result = json.result;
    if (!result || !Array.isArray(result.data)) {
      console.error('Cloudflare AutoRAG returned unexpected structure:', result);
      return null;
    }
    return result as CloudflareSearchResult;
  } catch (err) {
    console.error('Cloudflare AutoRAG search error:', err);
    return null;
  }
}

/**
 * Fetch the content of a URL and upload it to Cloudflare AutoRAG so it can be
 * semantically searched later.  Metadata includes the organization_id so
 * searches can be scoped per-tenant.
 *
 * Returns true on success, false when credentials are absent or an error
 * occurs (failures are non-fatal – the URL is already saved in Supabase).
 */
export async function indexUrlInAutoRAG(
  url: string,
  organizationId: string
): Promise<boolean> {
  const { accountId, apiToken, autoRagName } = getCloudflareConfig();

  if (!accountId || !apiToken || !autoRagName) {
    return false;
  }

  try {
    // Fetch the URL content
    const contentResponse = await fetch(url, {
      headers: { 'User-Agent': 'Answerify/1.0 (knowledge-base indexer)' },
    });
    if (!contentResponse.ok) {
      console.error(
        'Failed to fetch URL for AutoRAG indexing:',
        url,
        contentResponse.status
      );
      return false;
    }

    const rawText = await contentResponse.text();
    const contentType = contentResponse.headers.get('content-type') ?? '';

    // Use the existing jsdom-based cleaner for HTML; otherwise keep as-is.
    const plainText = contentType.includes('text/html')
      ? cleanBody(rawText)
      : rawText;

    // Build a deterministic filename scoped to this org.  Hashing the URL
    // avoids truncation artifacts and guarantees uniqueness — re-indexing the
    // same URL for the same org is idempotent (overwrites the previous file).
    const urlHash = createHash('sha256').update(url).digest('hex').slice(0, 16);
    const filename = `${organizationId}/${urlHash}.txt`;

    const metadata = JSON.stringify({
      organization_id: organizationId,
      source_url: url,
    });

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([plainText], { type: 'text/plain' }),
      filename
    );
    formData.append('metadata', metadata);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/autorag/rags/${autoRagName}/files`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
        body: formData,
      }
    );

    if (!response.ok) {
      console.error(
        'Cloudflare AutoRAG indexing failed:',
        response.status,
        await response.text()
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('Cloudflare AutoRAG indexing error:', err);
    return false;
  }
}
