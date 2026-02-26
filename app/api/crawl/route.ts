import { JSDOM } from 'jsdom';

const CRAWL_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
    });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Answerify/1.0; +https://answerify.com)',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch URL: ${response.statusText}`,
        }),
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return new Response(
        JSON.stringify({ error: 'URL does not return an HTML page' }),
        { status: 400 }
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Page is too large to crawl' }),
        { status: 400 }
      );
    }

    // Read with size guard
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'Failed to read response' }), {
        status: 500,
      });
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_RESPONSE_SIZE) {
        await reader.cancel();
        return new Response(
          JSON.stringify({ error: 'Page is too large to crawl' }),
          { status: 400 }
        );
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.byteLength + chunk.byteLength);
        merged.set(acc, 0);
        merged.set(chunk, acc.byteLength);
        return merged;
      }, new Uint8Array(0))
    );

    const dom = new JSDOM(html, { url });
    const linkElements = dom.window.document.querySelectorAll('a[href]');

    const pages = new Set<string>();

    // Always include the original URL
    const originalUrl = new URL(url);
    originalUrl.hash = '';
    pages.add(originalUrl.href);

    linkElements.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const linkUrl = new URL(href, url);
        // Only include same-origin links
        if (linkUrl.origin !== baseUrl.origin) return;
        // Skip mailto, tel, javascript, etc.
        if (!['http:', 'https:'].includes(linkUrl.protocol)) return;
        // Remove hash for deduplication
        linkUrl.hash = '';
        pages.add(linkUrl.href);
      } catch {
        // Invalid URL, skip
      }
    });

    return new Response(JSON.stringify({ pages: Array.from(pages) }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out while crawling the URL'
        : 'Failed to crawl URL';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
