---
name: tavily
aliases: [search, websearch, research]
description: |
  Perform real-time web searches and extract deep content from specific URLs using the Tavily MCP server.
  
  **When to use Tavily:**
  - Library/framework is NOT in the Context7 registry (~50+ supported libraries)
  - General troubleshooting, news, or current events
  - Architecture decisions requiring community consensus
  - Checking latest versions, changelogs, or breaking changes
  - Comparing multiple solutions or tools
  
  **When to use Context7 instead:**
  - Library IS in the Context7 registry (React, Next.js, Drizzle, Prisma, etc.)
  - Need structured, version-specific API documentation
  - Need code examples from official docs
  
  **Fallback chain:** Context7 (primary) → Tavily MCP (secondary) → webfetch/curl on specific URLs (tertiary)
---

# Tavily

## Overview

Tavily is a real-time web search and content extraction service available as a remote MCP server. Agents use it via the `tavily_search` and `tavily_extract` MCP tools.

## MCP Tools

### `tavily_search`

Performs a web search and returns results with optional content extraction.

**Parameters:**
- `query` (required): Search query string
- `search_depth` (optional): `"basic"` or `"advanced"` — use `"advanced"` for technical research (default: `"basic"`)
- `max_results` (optional): Number of results (default: `5`, use `10` for deep research)
- `include_answer` (optional): Include AI-generated summary boolean (default: `false`, use `true` when exploring unknown topics)

**When to use:**
- General research when Context7 has no match
- Current best practices, community discussions
- Comparing solutions or verifying recent changes

**Example query:**
```
tavily_search(query="best Node.js logging library 2026 comparison", max_results=10, search_depth="advanced", include_answer=true)
```

### `tavily_extract`

Extracts full content from one or more URLs.

**Parameters:**
- `urls` (required): Array of URLs to extract (max 20)
- `include_images` (optional): Extract images description (default: false)

**When to use:**
- After `tavily_search` identifies promising URLs and you need deep reading
- Fetching a specific changelog, blog post, or documentation page not covered by Context7

## Workflow

1. **Check Context7 first**: If researching a library, try the `context7` skill before Tavily.
2. **Tavily search**: If Context7 has no match OR the topic is general web research, use `tavily_search` with `search_depth="advanced"` and `max_results=10`.
3. **Extract promising URLs**: If search results look good, run `tavily_extract` on the top 3-5 URLs for deep content.
4. **Summarize and return**: Return a brief summary + file locations (if persisted to `.tmp/external-context/`).

## Fallback Rules

- If **Tavily MCP is disabled/unavailable** (`enabled: false` or network error):
  - Use `webfetch` on specific known URLs
  - Use `curl` for API calls
  - Do not fail the research task
- If **Tavily returns no results**: broaden the query or fall back to `webfetch`/curl.

## Parameters Heuristics

| Scenario | `search_depth` | `max_results` | `include_answer` |
|----------|---------------|---------------|------------------|
| Quick lookup | basic | 5 | false |
| Troubleshooting | advanced | 10 | true |
| Architecture comparison | advanced | 10 | true |
| API docs not in Context7 | advanced | 5 | false |

## Important Notes

- Tavily is a **paid/limited API**. Use it efficiently. Prefer Context7 for supported libraries.
- Never commit Tavily API keys to the repository. The key is injected by the install script.
- If Tavily quota is exceeded, fall back immediately to `webfetch`/`curl`.
