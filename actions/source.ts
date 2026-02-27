'use server';

import { indexUrlInAutoRAG } from '@/lib/cloudflare';
import { createServerClient } from '@/lib/supabase/server';

export async function getSources(id: string) {
  const supabase = await createServerClient();
  return await supabase
    .from('datasource')
    .select()
    .match({ organization_id: id });
}

export async function setupSources(slug: string, sources: { url: string }[]) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .select('id')
    .match({ slug })
    .single();
  if (error || !data?.id) return { data: null, error };

  const result = await supabase
    .from('datasource')
    .insert(
      sources
        .filter(({ url }) => url)
        .map(({ url }) => ({
          organization_id: data.id,
          url,
          is_internal_kb: true,
        }))
    )
    .select();

  // Index each URL in Cloudflare AutoRAG so it can be semantically searched.
  // Use the organization_id from the inserted records to guarantee each URL is
  // indexed under the correct tenant.  Failures are non-fatal — the URLs are
  // already persisted in Supabase.
  if (!result.error && result.data) {
    await Promise.allSettled(
      result.data.map((source) =>
        indexUrlInAutoRAG(source.url, source.organization_id)
      )
    );
  }

  return result;
}
