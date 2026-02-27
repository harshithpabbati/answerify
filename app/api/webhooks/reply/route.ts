import { GoogleGenAI } from '@google/genai';
import { codeBlock } from 'common-tags';
import { Resend } from 'resend';

import {
  AUTOPILOT_THRESHOLD_DEFAULT,
  URL_CONTEXT_FALLBACK_CONFIDENCE,
} from '@/lib/autopilot';
import { createServiceClient } from '@/lib/supabase/service';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

type Citation = {
  title: string;
  url: string;
  datasource_id: string;
  snippet?: string;
};

async function sendReplyViaResend({
  to,
  subject,
  content,
  messageId,
}: {
  to: string;
  subject: string;
  content: string;
  messageId: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data } = await resend.emails.send({
    from: 'Support <support@answerify.dev>',
    to: [to],
    subject,
    html: content,
    headers: { 'In-Reply-To': messageId },
  });
  return data;
}

export async function POST(request: Request) {
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ai = getGenAIClient();
  const supabase = await createServiceClient();

  // Fetch org settings for autopilot
  const { data: org } = await supabase
    .from('organization')
    .select('autopilot_enabled, autopilot_threshold, support_email')
    .eq('id', record.organization_id)
    .single();

  const autopilotEnabled = org?.autopilot_enabled ?? false;
  const autopilotThreshold =
    org?.autopilot_threshold ?? AUTOPILOT_THRESHOLD_DEFAULT;

  // Fetch datasources for the organization
  const { data: datasources } = await supabase
    .from('datasource')
    .select('id, title, url, content')
    .eq('organization_id', record.organization_id);

  // Fetch previous emails in this thread for conversation context
  const { data: threadEmails, error: threadEmailsError } = await supabase
    .from('email')
    .select('role, cleaned_body, created_at')
    .eq('thread_id', record.thread_id)
    .neq('id', record.id)
    .order('created_at', { ascending: true })
    .limit(10);

  if (threadEmailsError) {
    console.error('Failed to fetch thread emails:', threadEmailsError);
  }

  if (!datasources || datasources.length === 0) {
    // No knowledge base content found – create a draft asking for more info
    const clarifyingContent = `<p>Thank you for reaching out. I wasn't able to find specific information to fully answer your question at this time. Could you please provide more details or clarify your request so we can assist you better?</p>`;
    const { data, error } = await supabase
      .from('reply')
      .insert({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: clarifyingContent,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      })
      .select()
      .single();
    return new Response(JSON.stringify({ data, error }), { status: 200 });
  }

  // Separate URL-based and content-only datasources
  const urlSources = datasources.filter(
    (d) => d.url && !d.url.startsWith('internal://')
  );
  const contentSources = datasources.filter(
    (d) => d.content && (!d.url || d.url.startsWith('internal://'))
  );

  // Build inline content for content-only datasources (e.g. internal KB)
  const inlineDocs =
    contentSources.length > 0
      ? contentSources.map((d) => d.content).join('\n\n')
      : '';

  // Build URL list for Gemini URL context tool
  const urlList = urlSources.map((d) => d.url).join('\n');

  // Build conversation history context
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

  const systemPrompt = codeBlock`
    You are a friendly and helpful customer support agent. You write like a real person,
    not a documentation bot. Keep your tone warm, conversational, and to the point.

    When answering:
    - Address the customer directly
    - Don't use section headers or bold titles unless truly necessary
    - Avoid bullet points for simple answers; use them only when listing steps or options
    - Don't narrate what you're about to do (e.g. avoid "Here's a breakdown of..." or "Now I will answer...")
    - Do not include any internal reasoning, planning, or thinking in your response
    - Get straight to the answer
    - Keep it concise but complete
    - Do not include citation markers like [cite: 1] or [1] inline in the text

    You're only allowed to use the provided URLs and documents to answer the question.

    If the question isn't related to these sources, respond with only the text: NO_INFORMATION
    If the information isn't available in the provided sources, respond with only the text: NO_INFORMATION
    Do not explain why. Do not apologize. Do not add anything else. Just respond with NO_INFORMATION.

    Do not go off topic.

    ${inlineDocs ? `Documents:\n${inlineDocs}\n` : ''}
    ${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}
    Reply back in HTML and nothing else, avoid using markdown.
    Format the response as follows:
    - Use <p> tags for each distinct topic or thought
    - When answering multiple questions, use a <p><strong>Topic</strong></p> followed by a <p> for the answer
    - Use <ul> and <li> only for genuine lists (3+ items or step-by-step options)
    - Add a short friendly opening line in its own <p>
    - Keep paragraphs short (2-4 sentences max)
    - Do not use <h1>, <h2>, <h3> tags
    - Avoid signature at the end of the reply
    - Do not output anything outside of the HTML response
  `;

  const userMessage = urlList
    ? `${record.cleaned_body}\n\nReference URLs:\n${urlList}`
    : record.cleaned_body;

  const chatResult = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
      temperature: 0.7,
      tools: [{ urlContext: {} }],
    },
  });

  const rawContent = chatResult.text;

  if (!rawContent || rawContent.trim() === 'NO_INFORMATION') {
    // Generate clarifying question draft instead of erroring out
    const clarifyingContent = `<p>Thank you for contacting us. Based on the information available, I wasn't able to provide a complete answer to your question. Could you please provide more details or rephrase your question so we can assist you better?</p>`;
    const { data, error } = await supabase
      .from('reply')
      .insert({
        organization_id: record.organization_id,
        thread_id: record.thread_id,
        content: clarifyingContent,
        status: 'draft',
        confidence_score: 0,
        citations: [],
      })
      .select()
      .single();
    return new Response(JSON.stringify({ data, error }), { status: 200 });
  }

  // Build datasource lookup map for matching grounding URLs to datasources
  const datasourceByUrl = new Map(
    urlSources.map((d) => [d.url, { id: d.id, title: d.title }])
  );

  // Extract citations from grounding metadata provided by URL context
  const groundingMetadata = chatResult.candidates?.[0]?.groundingMetadata;
  const groundingChunks = groundingMetadata?.groundingChunks ?? [];

  const citations: Citation[] = [];
  const seenUrls = new Set<string>();

  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    if (!uri || seenUrls.has(uri)) continue;
    seenUrls.add(uri);

    // Match grounding URL to a known datasource by comparing hostnames and paths
    const groundingUrl = new URL(uri);
    const matchedDs = [...datasourceByUrl.entries()].find(([dsUrl]) => {
      try {
        const ds = new URL(dsUrl);
        return (
          groundingUrl.hostname === ds.hostname &&
          groundingUrl.pathname.startsWith(ds.pathname)
        );
      } catch {
        return false;
      }
    });

    citations.push({
      datasource_id: matchedDs?.[1]?.id ?? '',
      title: chunk.web?.title ?? matchedDs?.[1]?.title ?? new URL(uri).hostname,
      url: uri,
    });
  }

  // Average grounding confidence scores to derive an overall confidence.
  // Averaging reflects how well the response is supported across all claims,
  // unlike Math.max which only captures the best-supported claim.
  const groundingSupports = groundingMetadata?.groundingSupports ?? [];
  const allScores = groundingSupports.flatMap((s) => s.confidenceScores ?? []);
  const confidence =
    allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
      : urlSources.length > 0
        ? URL_CONTEXT_FALLBACK_CONFIDENCE
        : 0;

  // Build citation footnote HTML
  const citationFootnotes =
    citations.length > 0
      ? `<hr/><p style="font-size:0.85em;color:#666;"><strong>Sources:</strong> ${citations
          .map(
            (c, i) =>
              `<a href="${c.url}" target="_blank" rel="noopener noreferrer">[${i + 1}] ${c.title}</a>`
          )
          .join(', ')}</p>`
      : '';

  const htmlContent =
    rawContent.replace(/^```html\s*|\s*```$/g, '') + citationFootnotes;

  // Decide autopilot: send automatically if enabled and above threshold
  const shouldAutoSend = autopilotEnabled && confidence >= autopilotThreshold;

  if (shouldAutoSend) {
    // Fetch thread info to send the email
    const { data: thread } = await supabase
      .from('thread')
      .select('email_from, subject, message_id')
      .eq('id', record.thread_id)
      .single();

    if (thread) {
      try {
        const resendResult = await sendReplyViaResend({
          to: thread.email_from,
          subject: thread.subject,
          content: htmlContent,
          messageId: thread.message_id,
        });

        if (resendResult?.id) {
          const { data, error } = await supabase
            .from('reply')
            .insert({
              organization_id: record.organization_id,
              thread_id: record.thread_id,
              content: htmlContent,
              status: 'sent',
              confidence_score: confidence,
              citations: citations,
              sent_at: new Date().toISOString(),
              sent_via: 'resend',
            })
            .select()
            .single();
          return new Response(JSON.stringify({ data, error }), { status: 200 });
        }
      } catch (e) {
        console.error('Autopilot send failed:', e);
        // Fall through to draft
      }
    }
  }

  // Save as draft
  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: htmlContent,
      status: 'draft',
      confidence_score: confidence,
      citations: citations,
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
