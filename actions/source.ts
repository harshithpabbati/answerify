'use server';

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

  return await supabase
    .from('datasource')
    .insert(
      sources
        .filter(({ url }) => url)
        .map(({ url }) => ({
          organization_id: data.id,
          url,
        }))
    )
    .select();
}
