'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';

import { indexDatasource } from '@/lib/index-datasource';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

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

export async function deleteSource(id: string, slug: string) {
  const supabase = await createServerClient();
  // Sections are deleted via cascade (datasource_id FK)
  const { error } = await supabase.from('datasource').delete().eq('id', id);
  if (!error) {
    revalidatePath(`/org/${slug}`);
    revalidatePath(`/org/${slug}/admin`);
  }
  return { error };
}

export async function reindexSource(id: string, slug: string) {
  const supabase = await createServiceClient();

  // Fetch the datasource record
  const { data: source, error: fetchError } = await supabase
    .from('datasource')
    .select('id, url, organization_id')
    .eq('id', id)
    .single();
  if (fetchError || !source) return { error: fetchError };

  // Delete existing sections so we start fresh
  await supabase.from('section').delete().eq('datasource_id', id);

  // Re-run the full indexing pipeline
  await indexDatasource(source);

  revalidatePath(`/org/${slug}/admin`);
  return { error: null };
}

export type AdminSource = {
  id: string;
  url: string;
  status: string;
  created_at: string;
  organization_id: string;
  is_internal_kb: boolean | null;
  section_count: number;
};

export async function getAdminSources(
  orgId: string
): Promise<AdminSource[]> {
  const supabase = await createServerClient();

  const [{ data: sources }, { data: sectionCounts }] = await Promise.all([
    supabase
      .from('datasource')
      .select('id, url, status, created_at, organization_id, is_internal_kb')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('section')
      .select('datasource_id')
      .eq('organization_id', orgId),
  ]);

  const countMap: Record<string, number> = {};
  for (const row of sectionCounts ?? []) {
    countMap[row.datasource_id] = (countMap[row.datasource_id] ?? 0) + 1;
  }

  return (sources ?? []).map((s) => ({
    ...s,
    section_count: countMap[s.id] ?? 0,
  }));
}

export type RecentReply = {
  id: string;
  thread_id: string;
  confidence_score: number;
  status: string;
  is_perfect: boolean | null;
  created_at: string;
};

export async function getRecentReplies(
  orgId: string,
  limit = 20
): Promise<RecentReply[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('reply')
    .select('id, thread_id, confidence_score, status, is_perfect, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
