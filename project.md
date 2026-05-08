slug: 12-harshith-pabbati
title: Answerify: AI-Powered Customer Support Platform
students:
  - Harshith Pabbati
tags:
  - customer-support
  - rag
  - email-automation
  - workflow-automation
  - enterprise-tools
category: enterprise-tools
tagline: AI customer support that drafts, cites, and automates email replies.
featuredEligible: true

semester: "Spring 2026"

shortTitle: "Answerify"
studentId: ""
videoUrl: ""
thumbnail: ""
githubUrl: https://github.com/harshithpabbati/answerify
---


## Problem

Support teams lose time answering repetitive emails, searching scattered documentation, and manually triaging tickets before they can respond. Small teams especially struggle to maintain fast, accurate, and consistent support when ticket volume grows.


## Solution

Answerify is an AI-powered customer support workspace that turns documentation, prior replies, and live tool data into grounded email responses. It classifies ticket intent, retrieves relevant knowledge, drafts or auto-sends replies based on confidence, and lets teams define workflows for common support scenarios.


## User Flow

- Create an organization workspace and connect the support inbox during onboarding.
- Add documentation URLs or internal knowledge sources so Answerify can index them into a searchable knowledge base.
- Receive inbound customer emails in the shared inbox, where each conversation is automatically tagged by intent.
- Let the system retrieve grounded context, call connected MCP tools when needed, and generate a draft or auto-send a reply when confidence is high enough.
- Review conversations, edit replies, and approve strong responses so the system can learn from them over time.
- Configure workflows, tone policy, and autopilot thresholds to match the team’s support process.


## LLM Components

- **Intent detection** — classifies incoming customer emails into support categories such as billing, bugs, onboarding, privacy, and refunds.
- **RAG reply generation** — combines vector retrieval, neighboring section expansion, and knowledge-base tools to create grounded HTML replies with citations.
- **Confidence-based autopilot** — blends retrieval and model confidence to decide whether a reply should be auto-sent or saved as a draft for human review.
- **MCP tool augmentation** — queries external MCP servers for live business data before composing a response.
- **Learning loop** — turns approved human responses into new indexed knowledge so future replies improve over time.


## Tools

- **Frontend:** Next.js 16, React 19, Tailwind CSS, Radix UI, Tiptap
- **Backend:** Next.js App Router, TypeScript, Supabase, Resend
- **LLM:** Google Gemini 2.5 Flash, Gemini Embeddings, AI SDK, MCP
- **Infra / Data:** pgvector, Supabase Realtime, Cloudflare AI Gateway
