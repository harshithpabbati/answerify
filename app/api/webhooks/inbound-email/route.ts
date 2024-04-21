import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { session, from, subject, text, html, messageId, references } =
    await request.json();

  if (
    session.mta !== 'mx1.forwardemail.net' &&
    session.mta !== 'mx2.forwardemail.net'
  ) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 404,
    });
  }

  const supabase = await createServiceClient();
  const { data: orgData, error: orgError } = await supabase
    .from('organization')
    .select('id')
    .eq('inbound_email', session.recipient)
    .single();

  if (orgError) {
    return new Response(
      JSON.stringify({ error: 'Failed to find the recipient' }),
      {
        status: 200,
      }
    );
  }

  let threadId: string | null = null;
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
        {
          status: 200,
        }
      );
    }
    threadId = data.id;
  } else {
    const { data, error } = await supabase
      .from('thread')
      .insert({
        organization_id: orgData.id,
        email_from: from.value[0].address,
        email_from_name: from.value[0].name,
        subject,
        message_id: messageId,
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to create thread' }),
        {
          status: 200,
        }
      );
    }
    threadId = data.id;
  }

  if (!threadId) {
    return new Response(
      JSON.stringify({ error: 'Failed to find the thread' }),
      {
        status: 200,
      }
    );
  }

  const { error: emailError } = await supabase
    .from('email')
    .insert({
      organization_id: orgData.id,
      thread_id: threadId,
      email_from: from.value[0].address,
      email_from_name: from.value[0].name,
      body: html,
      cleaned_body: text,
      role: 'user',
    })
    .single();

  if (emailError) {
    return new Response(JSON.stringify({ error: 'Failed to create email' }), {
      status: 200,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
}
