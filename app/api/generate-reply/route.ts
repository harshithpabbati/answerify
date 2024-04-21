import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { id } = await request.json();

  const supabase = await createServiceClient();
  const { data: record, error } = await supabase
    .from('email')
    .select()
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: true }), { status: 500 });
  }

  fetch(`${origin}/api/webhooks/reply`, {
    method: 'POST',
    body: JSON.stringify({ record }),
  })
    .then((res) => res.json())
    .then((response) => console.log(response));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
