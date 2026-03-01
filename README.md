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

When a human edits an AI draft and clicks **"Approve & Send"**, the system automatically:

1. Sends the reply to the customer.
2. Stores an edit log (`reply_edit` table) with the original and final content if the reply was edited.
3. Finds or creates an internal knowledge-base datasource (`is_internal_kb = true`) for the organization.
4. Chunks the final answer into sections and generates embeddings.
5. Inserts the sections into the `section` table so they affect future retrieval.

This progressively improves the quality of future AI replies without any extra manual steps.

### reply_edit table SQL

Run the following in Supabase to create the `reply_edit` table:

```sql
CREATE TABLE IF NOT EXISTS "public"."reply_edit" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "reply_id" uuid NOT NULL,
    "organization_id" uuid NOT NULL,
    "original_content" text NOT NULL,
    "final_content" text NOT NULL,
    "learned" boolean DEFAULT false NOT NULL,
    CONSTRAINT "reply_edit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "public_reply_edit_reply_id_fkey"
        FOREIGN KEY ("reply_id") REFERENCES "public"."reply"("id")
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "public_reply_edit_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "reply_edit_reply_id_idx"
    ON "public"."reply_edit" USING btree ("reply_id");

CREATE INDEX IF NOT EXISTS "reply_edit_organization_id_idx"
    ON "public"."reply_edit" USING btree ("organization_id");

ALTER TABLE "public"."reply_edit" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."reply_edit" TO "anon";
GRANT ALL ON TABLE "public"."reply_edit" TO "authenticated";
GRANT ALL ON TABLE "public"."reply_edit" TO "service_role";
```

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (used in webhooks) |
| `NEXT_PUBLIC_BASE_URL` | Base URL of your deployment (e.g. `https://answerify.dev`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `GEMINI_API_KEY` | Google Gemini API key for embeddings (`gemini-embedding-001`) and completions (`gemini-3-flash-preview`) |
| `CLOUDFLARE_AGENT_URL` | *(Optional)* URL of the deployed Cloudflare Worker (see below) |
| `CLOUDFLARE_AGENT_SECRET` | *(Optional)* Shared secret to authenticate calls from Next.js to the Worker |

---

## Cloudflare Agents Integration

The `worker/` directory contains a [Cloudflare Agents](https://agents.cloudflare.com/) Worker that handles inbound email processing and AI reply generation entirely on Cloudflare's infrastructure, replacing both the `/api/webhooks/inbound-email` and `/api/webhooks/reply` Next.js routes.

### Why Cloudflare Agents?

| | Next.js serverless | Cloudflare Agent Worker |
|---|---|---|
| Inbound email | HTTP webhook (base64 raw body) | Native `email` export – raw `EmailMessage` direct from Cloudflare Email Routing |
| Execution timeout | ~60 s (Vercel) | Minutes to hours (Durable Objects) |
| State persistence | None – stateless per request | Built-in SQLite per agent instance |
| Parallelism | One function per request | One Durable Object per email thread |
| Observability | Logs only | State introspection + scheduling |
| Reply routing | Lookup by message-id | Sub-address routing (`support+<threadId>@domain`) |

The `EmailReplyAgent` extends the Cloudflare [`Agent`](https://agents.cloudflare.com/) class. Each email thread gets its own Durable Object instance, so parallel threads are fully isolated and never block each other. Agent state (`status`, `findings`, `reply`, `confidence`) is persisted across the research and writing steps, enabling safe retries if any step fails.

### Deploying the Worker

```bash
cd worker
npm install
npm run deploy        # wrangler deploy

# Set secrets (run once):
wrangler secret put GEMINI_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put INBOUND_WEBHOOK_SECRET   # shared with Next.js CLOUDFLARE_AGENT_SECRET
```

After deploying:
1. Point your [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) destination to this Worker (instead of the Next.js `/api/webhooks/inbound-email` URL).
2. Set `CLOUDFLARE_AGENT_URL` and `CLOUDFLARE_AGENT_SECRET` in your Next.js environment so the dashboard's "Generate Reply" action calls the Worker.

Without these variables the app falls back to the built-in Next.js webhook (original behaviour).

### How it works

```
Customer sends email
        │
        ▼
Cloudflare Email Routing
        │  delivers raw EmailMessage
        ▼
Worker email handler
        │  resolveEmailToAgent():
        │   1. sub-address routing  support+<threadId>@domain → existing thread
        │   2. In-Reply-To lookup   → existing thread via Supabase
        │   3. new UUID             → new thread
        │
        ▼  routeAgentEmail()
EmailReplyAgent (Durable Object, one per thread)
        │
        ├─ onEmail()
        │   ├─ isAutoReplyEmail check (RFC 3834)
        │   ├─ Parse raw email (PostalMime)
        │   ├─ Look up organization by recipient address
        │   ├─ Create/reopen thread in Supabase
        │   ├─ Insert email record
        │   └─ generateReply() ──────────────────────────────────────┐
        │                                                             │
        └─ onRequest()  ◄── Next.js /api/generate-reply              │
            (manual trigger from dashboard)                           │
            └─ generateReply() ────────────────────────────────────► │
                                                                      ▼
                                              Step 1: Research Agent (Gemini + URL context)
                                                       grounding metadata → confidence score
                                              Step 2: Writing Agent (Gemini)
                                                       produces polished HTML reply
                                              Step 3: Auto-send (Resend) or save as draft
                                                       Reply-To: support+<threadId>@domain
                                                       so customer replies route back here
```
