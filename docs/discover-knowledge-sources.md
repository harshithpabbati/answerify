# Discover public knowledge base sources

When a support question exposes a gap in your knowledge base, use
[Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) in
Codex to find relevant public documentation. Review the pages, then import the
URLs you trust into Answerify. For example, a team supporting a Supabase-based
product could find the official password-reset documentation before writing
answers about account recovery.

This is a manual source-discovery workflow. Answerify's **MCP Servers** connection
currently uses SSE, while Parallel Search MCP uses Streamable HTTP. Configure
Parallel in your external MCP client as shown below; pasting its endpoint into
Answerify's MCP server form will not connect it. Answerify's sandbox checks the
indexed knowledge base rather than calling Parallel.

## 1. Connect Parallel in Codex

You need a working [Codex CLI](https://developers.openai.com/codex/cli) installation
and an Answerify organization with source management access. Your Answerify
deployment must already have working data-source indexing and AI configuration.

Register the server under an unused name, then inspect its configuration:

```bash
codex mcp add parallel-search --url https://search.parallel.ai/mcp
codex mcp get parallel-search --json
```

The configuration should show a `streamable_http` transport with the URL above.
Start a new Codex session after adding it. Parallel provides `web_search` and
`web_fetch` without a Parallel account or API key; anonymous search uses Fast
mode and has rate limits. Codex still needs its own model access.

## 2. Research one public support topic

Use a generic topic rather than pasting customer emails, account details, or
credentials into a research prompt. For example:

```text
Use Parallel's web_search to find up to three official Supabase documentation
pages about password reset with JavaScript: sending a reset email, configuring
the redirect URL, and setting the new password. Prefer current official docs.
If the excerpts are insufficient to confirm a page's relevance, use web_fetch
to inspect it. Return each canonical URL, the topic it covers, and any SDK or
version assumptions. Do not infer our product's own account-recovery policy.
```

Open the suggested pages yourself. Check the publisher, product version, and
whether the guidance applies to your service. Select individual documentation
pages that your team can use as support references. A search summary is not a
replacement for checking the source, and third-party documentation does not
establish your own billing, security, or support policies.

## 3. Import the reviewed URLs

1. Open your Answerify organization dashboard. In **Data Sources**, choose
   **+ Add Source**, then **Add URLs**.
2. Paste a reviewed page URL. Use **Add URL** for more pages, then **Save**.
   Import the documentation URLs, not the `https://search.parallel.ai/mcp`
   endpoint or the generated research summary.
3. Wait for indexing. Open **Admin** to inspect **Datasource Health** and confirm
   that the sources are **Ready** with a nonzero section count. **Ready** alone
   can also mean the page produced no readable sections.
4. For **Error**, stuck **Pending**, or zero-section sources, check that the URL
   is publicly readable and use that source's **Reindex** action. If it still
   yields no sections, choose another readable documentation page. Being
   readable by Parallel does not guarantee that Answerify's indexer can read it.

## 4. Check the answer in the sandbox

Choose **Open Sandbox** from the organization dashboard. Enter a synthetic
question covered by the imported pages, such as "How do I send a password-reset
email with Supabase JavaScript and set the new password after the redirect?",
then choose **Generate Preview Reply**.

Inspect **Sources Used**, **Matched Knowledge Base Sections**, and the reply.
Confirm that the imported content was retrieved and supports the answer. If
not, check the source's section count and try a more focused source or question.
The sandbox previews a reply without sending an email. Imported pages are
indexed snapshots; use **Reindex** after reviewing changes to their content.

To disconnect Parallel from Codex when you no longer need it:

```bash
codex mcp remove parallel-search
```

This removes the external MCP configuration. It does not delete sources already
imported into Answerify.
