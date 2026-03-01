import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { id } = await request.json();

  const supabase = await createServiceClient();
  const { data: record, error } = await supabase
    .from('email')
    .select('thread_id')
    .eq('id', id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: true }), { status: 500 });
  }

  // When a Cloudflare Agent Worker URL is configured, forward the request to
  // the EmailReplyAgent Durable Object for this thread.
  // The agent fetches all context (datasources, org, thread history) from
  // Supabase itself, so we only need to pass the email ID.
  const agentUrl = process.env.CLOUDFLARE_AGENT_URL;
  const agentSecret = process.env.CLOUDFLARE_AGENT_SECRET;
  if (agentUrl && agentSecret) {
    try {
      const threadId = record.thread_id as string;
      const agentEndpoint = `${agentUrl}/agents/email-reply-agent/${threadId}`;

      const agentResponse = await fetch(agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': agentSecret,
        },
        body: JSON.stringify({ emailId: id }),
      });

      if (!agentResponse.ok) {
        console.error(
          'Cloudflare Agent request failed:',
          await agentResponse.text()
        );
      }
    } catch (err) {
      console.error('Cloudflare Agent request error:', err);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Fallback: fire the local webhook (original behaviour, no Cloudflare Agent)
  try {
    const { data: fullRecord, error: fetchError } = await supabase
      .from('email')
      .select()
      .eq('id', id)
      .single();

    if (fetchError) {
      return new Response(JSON.stringify({ error: true }), { status: 500 });
    }

    const webhookResponse = await fetch(`${origin}/api/webhooks/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: fullRecord }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', await webhookResponse.text());
    }
  } catch (err) {
    console.error('Webhook request failed:', err);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
