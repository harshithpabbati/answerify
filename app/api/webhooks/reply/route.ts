import { GoogleGenAI } from '@google/genai';
import { codeBlock } from 'common-tags';

import { createServiceClient } from '@/lib/supabase/service';

function getGenAIClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

export async function POST(request: Request) {
  const { record } = await request.json();

  if (record.role !== 'user') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ai = getGenAIClient();
  const supabase = await createServiceClient();

  // Fetch datasources for the organization
  const { data: datasources } = await supabase
    .from('datasource')
    .select('id, url')
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

  // Build URL list for Gemini URL context tool
  const urlList = datasources.map((d) => d.url).join('\n');

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

  const htmlContent = rawContent.replace(/^```html\s*|\s*```$/g, '');

  // Save as draft
  const { data, error } = await supabase
    .from('reply')
    .insert({
      organization_id: record.organization_id,
      thread_id: record.thread_id,
      content: htmlContent,
      status: 'draft',
    })
    .select()
    .single();

  return new Response(JSON.stringify({ data, error }), { status: 200 });
}
