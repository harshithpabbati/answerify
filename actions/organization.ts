import { createServerClient } from '@/lib/supabase/server';

export async function getOrganizations() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .select('id, name, slug');
  if (error) return [];
  return data;
}
