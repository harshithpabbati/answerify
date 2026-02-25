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
2. The system retrieves relevant knowledge-base sections via vector similarity search.
3. A confidence score (0–1) is computed from the number and quality of matching sections.
4. If `autopilot_enabled = true` AND `confidence_score >= autopilot_threshold`:
   - The reply is automatically sent via Resend and stored with `status = 'sent'`.
5. Otherwise the reply is saved as `status = 'draft'` for human review.

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

The confidence score is a heuristic derived from vector similarity search results:

```
confidence = min(0.60 + sections_found × 0.08, 0.99)
```

| sections found | approximate confidence |
|---|---|
| 0 | 0.00 (always draft) |
| 1 | 0.68 |
| 2 | 0.76 |
| 3 | 0.84 |
| 5 | 0.99 |

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

When a human edits an AI draft and sends it, you can click **"Learn from this"** to:

1. Store an edit log (`reply_edit` table) with the original and final content.
2. Find or create an internal knowledge-base datasource (`is_internal_kb = true`) for the organization.
3. Chunk the final answer into sections and generate embeddings.
4. Insert the sections into the `section` table so they affect future retrieval.

This progressively improves the quality of future AI replies.

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (used in webhooks) |
| `NEXT_PUBLIC_BASE_URL` | Base URL of your deployment (e.g. `https://answerify.app`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `GEMINI_API_KEY` | Google Gemini API key for embeddings (`text-embedding-004`) and completions (`gemini-2.0-flash`) |

