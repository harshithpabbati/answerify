'use server';

import { cookies } from 'next/headers';
import { Database } from '@/database.types';
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from '@supabase/ssr';

export const createServerClient = () => {
  const cookieStore = cookies();
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            return;
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (e) {
            return;
          }
        },
      },
    }
  );
};
