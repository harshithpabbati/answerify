import Exa from 'exa-js';

/** Maximum number of Exa search results to include as context. */
const EXA_MAX_RESULTS = 3;

/** Maximum characters to include from each result's text. */
const EXA_MAX_TEXT_CHARS = 1500;

function formatSearchResult(
  r: { title?: string | null; url?: string | null; text?: string | null },
  index: number
): string {
  const title = r.title ? `[${index + 1}] ${r.title}` : `[${index + 1}]`;
  const url = r.url ? `Source: ${r.url}` : '';
  const text = r.text?.trim() ?? '';
  return [title, url, text].filter(Boolean).join('\n');
}

/**
 * Perform an Exa neural web search and return a plain-text summary of the
 * top results suitable for inclusion in the grounded answer agent prompt.
 *
 * Returns an empty string when EXA_API_KEY is not set or the search fails.
 */
export async function searchWeb(query: string): Promise<string> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return '';

  try {
    const exa = new Exa(apiKey);

    const result = await exa.searchAndContents(query, {
      numResults: EXA_MAX_RESULTS,
      type: 'neural',
      useAutoprompt: true,
      text: { maxCharacters: EXA_MAX_TEXT_CHARS },
    });

    if (!result.results?.length) return '';

    return result.results
      .map((r, i) => formatSearchResult(r, i))
      .join('\n\n---\n\n');
  } catch (err) {
    console.error('[exa-search] Web search failed:', err);
    return '';
  }
}
