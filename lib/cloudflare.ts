export interface CloudflareSearchData {
  content: string;
  filename: string;
  score: number;
}

export interface CloudflareSearchResult {
  data: CloudflareSearchData[];
}

/**
 * Query a Cloudflare AutoRAG instance for relevant content chunks.
 * Returns null when Cloudflare credentials are not configured or the
 * request fails so callers can fall back to alternative strategies.
 */
export async function searchAutoRAG(
  query: string,
  maxResults = 5
): Promise<CloudflareSearchResult | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const autoRagName = process.env.CLOUDFLARE_AUTORAG_NAME;

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
    if (
      !result ||
      !Array.isArray(result.data)
    ) {
      console.error('Cloudflare AutoRAG returned unexpected structure:', result);
      return null;
    }
    return result as CloudflareSearchResult;
  } catch (err) {
    console.error('Cloudflare AutoRAG search error:', err);
    return null;
  }
}
