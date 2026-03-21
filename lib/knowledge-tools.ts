import { tool } from 'ai';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { Database } from '@/database.types';
import { generateEmbedding, serializeEmbedding } from '@/lib/embeddings';

type AnySupabase = SupabaseClient<Database>;

type Section = {
  id: string;
  content: string;
  heading: string | null;
};

type Datasource = {
  id: string;
  url: string;
};

function formatSections(sections: Section[]): string {
  return sections
    .map((s, i) => `[Section ${i + 1}]${s.heading ? ` ${s.heading}` : ''}\n${s.content}`)
    .join('\n\n---\n\n');
}

/**
 * Creates AI SDK-compatible tools that query Answerify's own Supabase knowledge
 * base. These tools give the AI model multi-step retrieval capabilities — the
 * model calls them when the initial embedding context is insufficient to fully
 * answer a question.
 *
 * Three tools are provided:
 *   • search_knowledge_base  — semantic (vector) search via match_sections RPC
 *   • search_by_keyword      — full-text keyword search on section content
 *   • list_datasources       — list all knowledge-base sources for the org
 *
 * @param supabase       An active Supabase client (server or service role).
 * @param organizationId The UUID of the org whose sections to query.
 */
export function makeKnowledgeTools(supabase: AnySupabase, organizationId: string) {
  return {
    search_knowledge_base: tool({
      description:
        'Search the knowledge base using semantic similarity. ' +
        'Use this when you need to find sections related to a topic or question ' +
        'that is not covered by the already-retrieved context.',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The search query used to find relevant knowledge base sections.'),
        match_count: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(5)
          .describe('Maximum number of sections to return (1–10).'),
      }),
      execute: async ({ query, match_count }: { query: string; match_count: number }) => {
        try {
          const embedding = await generateEmbedding(query);
          if (!embedding.length) {
            return { result: 'No embedding could be generated for the query.' };
          }

          const { data, error } = await supabase.rpc('match_sections', {
            embedding: serializeEmbedding(embedding),
            match_threshold: 0.1,
            p_organization_id: organizationId,
            match_count,
          });

          if (error) {
            console.error('[knowledge-tools] search_knowledge_base RPC error:', error);
            return { result: 'Knowledge base search failed.' };
          }

          const sections = (data as Section[]) ?? [];
          if (!sections.length) {
            return { result: 'No relevant sections found for that query.' };
          }

          return { result: formatSections(sections) };
        } catch (err) {
          console.error('[knowledge-tools] search_knowledge_base error:', err);
          return { result: 'Knowledge base search failed.' };
        }
      },
    }),

    search_by_keyword: tool({
      description:
        'Search the knowledge base for an exact keyword or phrase. ' +
        'Use this for precise lookups of product names, error codes, configuration keys, ' +
        'or any specific term that semantic search might miss.',
      inputSchema: z.object({
        keyword: z
          .string()
          .describe('The keyword or phrase to search for in section content.'),
      }),
      execute: async ({ keyword }: { keyword: string }) => {
        try {
          // Sanitise keyword: strip SQL wildcard characters so only the intended
          // literal string is searched (defence-in-depth against prompt injection).
          const sanitised = keyword.replace(/[%_\\]/g, (c: string) => `\\${c}`);

          const { data, error } = await supabase
            .from('section')
            .select('id, content, heading')
            .ilike('content', `%${sanitised}%`)
            .eq('organization_id', organizationId)
            .limit(5);

          if (error) {
            console.error('[knowledge-tools] search_by_keyword error:', error);
            return { result: 'Keyword search failed.' };
          }

          const sections = (data as Section[]) ?? [];
          if (!sections.length) {
            return { result: `No sections found containing the keyword "${keyword}".` };
          }

          return { result: formatSections(sections) };
        } catch (err) {
          console.error('[knowledge-tools] search_by_keyword error:', err);
          return { result: 'Keyword search failed.' };
        }
      },
    }),

    list_datasources: tool({
      description:
        'List all knowledge base sources (datasources) available for this organisation. ' +
        'Call this first if you are unsure what topics the knowledge base covers.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { data, error } = await supabase
            .from('datasource')
            .select('id, url')
            .eq('organization_id', organizationId)
            .limit(50);

          if (error) {
            console.error('[knowledge-tools] list_datasources error:', error);
            return { result: 'Could not retrieve datasource list.' };
          }

          const sources = (data as Datasource[]) ?? [];
          if (!sources.length) {
            return {
              result: 'No knowledge base sources have been configured for this organisation.',
            };
          }

          return { result: sources.map((d, i) => `${i + 1}. ${d.url}`).join('\n') };
        } catch (err) {
          console.error('[knowledge-tools] list_datasources error:', err);
          return { result: 'Could not retrieve datasource list.' };
        }
      },
    }),
  };
}
