import { Tables } from '@/database.types';
import PostalMime from 'postal-mime';

import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const secret = request.headers.get('X-Webhook-Secret');
  if (secret !== process.env.EMAIL_ROUTING_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ ok: false }), { status: 401 });
  }

  const { raw, envelope } = await request.json();

  const rawBuffer = Buffer.from(raw, 'base64');
  const parser = new PostalMime();
  const parsed = await parser.parse(rawBuffer);

  const from = {
    value: [
      {
        address: parsed.from?.address || envelope.from,
        name: parsed.from?.name || '',
      },
    ],
  };
  const subject = parsed.subject || null;
  const text = parsed.text || null;
  const html = parsed.html || null;
  const messageId = parsed.messageId || null;
  const references = parsed.references || null;

  const supabase = await createServiceClient();

  const { data: orgData, error: orgError } = await supabase
    .from('organization')
    .select('id')
    .eq('inbound_email', envelope.to)
    .single();

  if (orgError) {
    return new Response(
      JSON.stringify({ error: 'Failed to find the recipient' }),
      { status: 200 }
    );
  }

  let thread: Tables<'thread'> | null = null;

  if (references) {
    const isArray = Array.isArray(references);
    const { data, error } = await supabase
      .from('thread')
      .select()
      .eq('message_id', isArray ? references[0] : references)
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to find the thread' }),
        { status: 200 }
      );
    }

    thread = data;
  } else {
    const { data, error } = await supabase
      .from('thread')
      .insert({
        organization_id: orgData.id,
        email_from: from.value[0].address as string,
        email_from_name: from.value[0].name,
        subject: subject as string,
        message_id: messageId as string,
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create thread' }),
        { status: 200 }
      );
    }

    thread = data;
  }

  if (!thread?.id) {
    return new Response(
      JSON.stringify({ error: 'Failed to find the thread' }),
      { status: 200 }
    );
  }

  const { data: emailData, error: emailError } = await supabase
    .from('email')
    .insert({
      organization_id: orgData.id,
      thread_id: thread.id,
      email_from: from.value[0].address,
      email_from_name: from.value[0].name,
      body: html as string,
      cleaned_body: text,
      role: 'user',
    })
    .select('created_at')
    .single();

  if (emailError) {
    return new Response(JSON.stringify({ error: 'Failed to create email' }), {
      status: 200,
    });
  }

  const threadUpdate: { last_message_created_at: string; status?: 'open' } = {
    last_message_created_at: emailData.created_at,
  };
  if (thread.status === 'closed') {
    threadUpdate.status = 'open';
  }
  const { error: threadUpdateError } = await supabase
    .from('thread')
    .update(threadUpdate)
    .match({ id: thread.id });

  if (threadUpdateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update thread' }),
      { status: 200 }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
