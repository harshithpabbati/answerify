'use server';

import { slugify } from '@/lib/slug';
import { createServerClient } from '@/lib/supabase/server';

import { getUser } from './auth';

export async function getOrganizations() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from('organization').select();
  if (error) return [];
  return data;
}

export async function getOrganization(id: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .select()
    .match({ id })
    .single();
  return { data, error };
}

export async function createOrganization({
  name,
  support_email,
}: {
  name: string;
  support_email: string;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await getUser();

  if (!user?.id) {
    throw new Error('User not found');
  }
  const { data, error } = await supabase
    .from('organization')
    .insert({
      name,
      slug: slugify(name),
      support_email,
      inbound_email: `${crypto.randomUUID()}@inbound.answerify.app`,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { data, error };

  const { error: memberError } = await supabase
    .from('member')
    .insert({
      organization_id: data.id,
      user_id: user.id,
      role: 2,
    })
    .single();
  if (memberError) return { data: null, error: memberError };

  return { data, error };
}

export async function updateOrganization(
  id: string,
  { name, support_email }: { name: string; support_email: string }
) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .update({ name, slug: slugify(name), support_email })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteOrganization(id: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .delete()
    .match({ id });
  return { data, error };
}

export async function getOrganizationEmail(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('organization')
    .select('inbound_email')
    .eq('slug', slug)
    .single();
  return { data, error };
}
