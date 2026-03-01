import { createServiceClient } from '@/lib/supabase/service';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { content } = await request.json();

  const supabase = await createServiceClient();

  const { data: reply, error: fetchError } = await supabase
    .from('reply')
    .select('content, status')
    .eq('id', id)
    .single();

  if (fetchError || !reply) {
    return new Response(JSON.stringify({ error: 'Reply not found' }), {
      status: 404,
    });
  }

  // Mark as approved and record whether the human edited the AI draft
  const isPerfect = reply.content === content;
  const { data, error } = await supabase
    .from('reply')
    .update({
      content,
      status: reply.status === 'sent' ? 'sent' : 'approved',
      is_perfect: isPerfect,
    })
    .eq('id', id)
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
