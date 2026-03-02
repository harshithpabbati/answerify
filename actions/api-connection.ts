'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';

export async function getApiConnections(organizationId: string) {
  const supabase = await createServerClient();
  return await supabase
    .from('api_connection')
    .select()
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
}

// Throws on error – suitable for use as a TanStack Query queryFn.
export async function fetchApiConnections(organizationId: string) {
  const { data, error } = await getApiConnections(organizationId);
  if (error) throw error;
  return data ?? [];
}

export async function addApiConnection(
  organizationId: string,
  {
    name,
    base_url,
    api_key,
    description,
  }: {
    name: string;
    base_url: string;
    api_key: string;
    description?: string;
  },
  slug: string
) {
  const supabase = await createServerClient();
  const result = await supabase
    .from('api_connection')
    .insert({
      organization_id: organizationId,
      name,
      base_url,
      api_key,
      description: description || null,
    })
    .select()
    .single();

  if (!result.error) {
    revalidatePath(`/org/${slug}`);
  }

  return result;
}

export async function deleteApiConnection(id: string, slug: string) {
  const supabase = await createServerClient();
  const result = await supabase
    .from('api_connection')
    .delete()
    .eq('id', id);

  if (!result.error) {
    revalidatePath(`/org/${slug}`);
  }

  return result;
}
