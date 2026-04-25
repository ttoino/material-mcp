# AGENTS.md

## What this is

Cloudflare Worker that exposes an MCP server for navigating the Material Design 3 docs (`m3.material.io`).

## Architecture

- **Runtime**: Cloudflare Workers (TypeScript, `nodejs_compat` flag)
- **Router**: Hono (`src/index.ts` is the only source file)
- **MCP**: `@modelcontextprotocol/server` v2 alpha, `WebStandardStreamableHTTPServerTransport`
- **Endpoint**: `POST /mcp` (Streamable HTTP)

### Bindings

| Binding       | Service                 | Purpose                                        |
| ------------- | ----------------------- | ---------------------------------------------- |
| `env.BROWSER` | Browser Run (Puppeteer) | Navigate and render JS-heavy pages             |
| `env.AI`      | Workers AI              | `toMarkdown()` converts HTML blobs to Markdown |

Both bindings have `"remote": true` in `wrangler.jsonc` so `wrangler dev` talks to the real Cloudflare services.

## Commands

```bash
pnpm dev                 # wrangler dev (local dev server)
pnpm check               # tsc --noEmit (type-check only)
pnpm deploy              # wrangler deploy
pnpm run gen:cf-types    # wrangler types (regenerate worker-configuration.d.ts)
```

Never edit `package.json` manually; use `pnpm install -D <pkg>`.

## Codegen

`wrangler types` generates `worker-configuration.d.ts` from `wrangler.jsonc`. **Rerun after any binding change.** The file is gitignored.

## MCP Tools

| Tool            | What it does                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `list_sections` | Fetches `m3.material.io/sitemap.xml`, returns top-level path segments                                              |
| `get_page`      | Puppeteer navigates to a path, waits for `<article>`, extracts `outerHTML`, feeds it through `env.AI.toMarkdown()` |

## Critical implementation quirk

`m3.material.io` is a JavaScript-heavy SPA. The `<article>` tag is rendered client-side, so `page.goto()` alone is not enough. The handler must call `await page.waitForSelector("article")` before extracting HTML.

## Lint / style

- ESLint with `perfectionist` plugin enforces **alphabetical ordering** on imports, exports, objects, classes, etc.
- Prettier is used for formatting.
- No tests exist in this repo.
