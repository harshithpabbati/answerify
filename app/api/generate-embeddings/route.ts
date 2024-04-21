import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createServiceClient();
  const { data: records, error } = await supabase
    .from('section')
    .select()
    .is('embedding', null);

  if (error) {
    return new Response(JSON.stringify({ error: true }), { status: 500 });
  }

  fetch(`${origin}/api/webhooks/embedding`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
