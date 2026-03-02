'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

// Cached so the layout/page and any other server component requesting the same
// org's sources within one render share a single Supabase round-trip.
const getSourcesCached = cache(async (id: string) => {
  const supabase = await createServerClient();
  return await supabase
    .from('datasource')
    .select()
    .match({ organization_id: id });
});

export async function getSources(id: string) {
  return getSourcesCached(id);
}

// Throws on error – suitable for use as a TanStack Query queryFn.
export async function fetchSources(id: string) {
  const { data, error } = await getSourcesCached(id);
  if (error) throw error;
  return data ?? [];
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

  if (!result.error) {
    revalidatePath(`/org/${slug}`);
  }

  return result;
}
