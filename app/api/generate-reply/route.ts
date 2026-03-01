import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const { id } = await request.json();

  const supabase = await createServiceClient();
  const { data: record, error } = await supabase
    .from('email')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: true }), { status: 500 });
  }

  // When a Cloudflare Agent Worker URL is configured, forward the request to
  // the EmailReplyAgent running on Cloudflare Workers with Durable Objects.
  // This provides timeout-resistant, stateful execution of the AI pipeline.
  // Each email thread gets its own isolated agent instance keyed by thread ID.
  const agentUrl = process.env.CLOUDFLARE_AGENT_URL;
  const agentSecret = process.env.CLOUDFLARE_AGENT_SECRET;
  if (agentUrl && agentSecret) {
    try {
      // Fetch all context the agent needs in parallel so we only make one
      // round-trip to Supabase before handing off to Cloudflare.
      const [
        { data: datasources },
        { data: org },
        { data: thread },
        { data: threadEmails },
      ] = await Promise.all([
        supabase
          .from('datasource')
          .select('id, url')
          .eq('organization_id', record.organization_id),
        supabase
          .from('organization')
          .select('autopilot_enabled, autopilot_threshold')
          .eq('id', record.organization_id)
          .single(),
        supabase
          .from('thread')
          .select('email_from, subject, message_id')
          .eq('id', record.thread_id)
          .single(),
        supabase
          .from('email')
          .select('role, cleaned_body, created_at')
          .eq('thread_id', record.thread_id)
          .neq('id', record.id)
          .order('created_at', { ascending: true })
          .limit(10),
      ]);

      const conversationHistory =
        threadEmails && threadEmails.length > 0
          ? threadEmails
              .map((e) => {
                const label =
                  e.role === 'user'
                    ? 'Customer'
                    : e.role === 'support'
                      ? 'Support'
                      : e.role;
                return `${label}: ${e.cleaned_body}`;
              })
              .join('\n\n')
          : '';

      // Route to the agent instance for this thread. The agent URL follows the
      // Cloudflare Agents convention: <worker-url>/agents/<agent-class>/<id>
      const threadId = record.thread_id as string;
      const agentEndpoint = `${agentUrl}/agents/email-reply-agent/${threadId}`;

      const agentResponse = await fetch(agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': agentSecret,
        },
        body: JSON.stringify({ record, datasources, org, thread, conversationHistory }),
      });

      if (!agentResponse.ok) {
        console.error('Cloudflare Agent request failed:', await agentResponse.text());
      }
    } catch (err) {
      console.error('Cloudflare Agent request error:', err);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Fallback: fire the local webhook (original behaviour, no Cloudflare Agent)
  try {
    const webhookResponse = await fetch(`${origin}/api/webhooks/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record }),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', await webhookResponse.text());
    }
  } catch (error) {
    console.error('Webhook request failed:', error);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
