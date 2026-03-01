/**
 * GET /api/robots?domain=https://example.com
 *
 * Fetches the robots.txt for the given domain and returns:
 *  - All Sitemap URLs found in the file
 *  - All unique path prefixes from Allow / Disallow directives
 *
 * The caller can then present these as selectable data-source candidates.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return Response.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  let baseUrl: string;
  try {
    const parsed = new URL(
      domain.startsWith('http') ? domain : `https://${domain}`
    );
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return Response.json({ error: 'Invalid domain' }, { status: 400 });
  }

  const robotsUrl = `${baseUrl}/robots.txt`;

  let text: string;
  try {
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Answerify-Bot/1.0' },
      // 5-second timeout via AbortSignal
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `robots.txt returned ${res.status}` },
        { status: 422 }
      );
    }
    text = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch robots.txt';
    return Response.json({ error: message }, { status: 422 });
  }

  const sitemaps: string[] = [];
  const paths = new Set<string>();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    // Collect sitemap URLs
    const sitemapMatch = line.match(/^Sitemap:\s*(.+)$/i);
    if (sitemapMatch) {
      sitemaps.push(sitemapMatch[1].trim());
      continue;
    }

    // Collect Allow / Disallow paths (skip wildcards and query params – these
    // can't reliably be turned into standalone datasource URLs; users can add
    // those manually if needed)
    const pathMatch = line.match(/^(?:Allow|Disallow):\s*(.+)$/i);
    if (pathMatch) {
      const p = pathMatch[1].trim();
      // Skip wildcards, empty paths, bare "/", and paths with query strings
      if (p && p !== '/' && !p.includes('*') && !p.includes('?')) {
        // Build a full URL from the path prefix
        const url = `${baseUrl}${p.startsWith('/') ? p : `/${p}`}`;
        paths.add(url);
      }
    }
  }

  return Response.json({
    baseUrl,
    sitemaps,
    paths: [...paths],
  });
}
