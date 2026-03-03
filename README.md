# Answerify - Your AI-Powered Support Ticket Superhero

Stop ticket trouble! Answerify uses the power of AI to automatically answer your customer questions, saving you time and delighting your customers.

## Features

- **Autopilot with Approval Loop** – Auto-send replies when AI confidence is high; fall back to human review for low-confidence or ambiguous requests.
- **Citations** – Every AI reply includes source references (title + URL) so agents can verify answers.
- **Learning Loop** – Human-approved edits can be fed back into the knowledge base to improve future answers.
- **Dark-mode-first UI** – Modern minimal dashboard inspired by Linear/Vercel aesthetics.

---

## Autopilot Behavior & Safety

Autopilot is **enabled by default** for new organizations with a confidence threshold of **0.65** (65%).

### How it works

1. An inbound email arrives and triggers reply generation.
2. The system embeds the question and searches the `section` table for semantically similar pre-indexed content chunks (Agentic RAG).
3. If enough high-quality vector matches are found (≥ 2 sections with similarity ≥ 0.65), the matched sections are used directly as context – **no URL fetching required**, dramatically reducing token usage.
4. If vector search yields insufficient matches, the system falls back to Gemini's URL context tool to fetch and process datasource URLs.
5. A confidence score (0–1) is computed from vector similarity or Gemini grounding metadata.
6. If `autopilot_enabled = true` AND `confidence_score >= autopilot_threshold`:
   - The reply is automatically sent via Resend and stored with `status = 'sent'`.
7. Otherwise the reply is saved as `status = 'draft'` for human review.

### Safety guardrails

- If no relevant knowledge-base content is found, a **clarifying question** draft is created instead of an empty reply.
- If the LLM returns `NO_INFORMATION`, a clarifying question draft is created (no auto-send).
- If the Resend API call fails, the reply is saved as `status = 'failed'` (no silent loss).

### Toggling autopilot per org

Update the `organization` table:

```sql
UPDATE organization
SET autopilot_enabled = false,   -- disable autopilot
    autopilot_threshold = 0.75   -- or raise the threshold
WHERE id = '<org-id>';
```

---

## Confidence Score

The confidence score is derived from two possible sources, depending on the retrieval strategy used:

**Vector search path (Agentic RAG):** Average similarity score from matched sections, clamped to `[0, 0.99]`.

**URL context fallback:** Derived from Gemini grounding metadata. Falls back to `0.70` when URL context was used but no explicit grounding scores are returned.

| scenario                        | approximate confidence |
| ------------------------------- | ---------------------- |
| No datasources                  | 0.00 (always draft)    |
| URL context, no grounding data  | 0.70                   |
| 2 sections, avg similarity 0.72 | 0.72                   |
| 3 sections, avg similarity 0.85 | 0.85                   |
| 5 sections, avg similarity 0.95 | 0.95                   |

The threshold is configurable per organization (`autopilot_threshold`, default `0.65`).

---

## Citations Format

Citations are stored as a JSONB array on the `reply` table:

```json
[
  {
    "datasource_id": "uuid",
    "title": "Getting Started Guide",
    "url": "https://docs.example.com/getting-started",
    "snippet": "First 200 characters of the matching section…"
  }
]
```

Citations are rendered as footnotes in the reply HTML and also displayed in the UI sources panel.

---

## Learning Loop

When a human edits an AI draft and clicks **"Approve & Send"**, the system automatically:

1. Sends the reply to the customer.
2. Tracks the human's edited version in `human_content` on the `reply` table (if different from the AI draft); sets `learned = false` initially.
3. Finds or creates an internal knowledge-base datasource (`is_internal_kb = true`) for the organization.
4. Chunks the final answer into sections and generates embeddings.
5. Inserts the sections into the `section` table so they affect future retrieval.
6. Sets `learned = true` on the `reply` row once embeddings are successfully stored.

This progressively improves the quality of future AI replies without any extra manual steps.

---

## Required Environment Variables

| Variable                        | Description                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key                                                                                   |
| `SUPABASE_SERVICE_KEY`          | Supabase service-role key (used in webhooks)                                                             |
| `NEXT_PUBLIC_BASE_URL`          | Base URL of your deployment (e.g. `https://answerify.dev`)                                               |
| `RESEND_API_KEY`                | Resend API key for sending emails                                                                        |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Google Gemini API key for embeddings (`gemini-embedding-001`) and completions (`gemini-3-flash-preview`) |
