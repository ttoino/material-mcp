# AGENTS.md

Cloudflare Worker that exposes an MCP server (and REST endpoints) for navigating Material Design 3 docs (`m3.material.io`).

## Architecture

- **Runtime**: Cloudflare Workers (TypeScript, `nodejs_compat` flag)
- **Router**: Hono (`src/app.ts`)
- **MCP**: `@modelcontextprotocol/server` v2 alpha, `WebStandardStreamableHTTPServerTransport`
- **Browser**: `@cloudflare/playwright` via Browser Run binding
- **Markdown conversion**: `env.AI.toMarkdown()`
- **Entry**: `src/index.ts` exports `app` from `src/app.ts`; all source lives in `src/`

### Bindings (`wrangler.jsonc`)

| Binding       | Service     | Purpose                               |
| ------------- | ----------- | ------------------------------------- |
| `env.BROWSER` | Browser Run | Render JS-heavy pages with Playwright |
| `env.AI`      | Workers AI  | `toMarkdown()` converts HTML to MD    |

Both have `"remote": true` — `pnpm dev` hits real Cloudflare services, not local mocks.

### Routes

| Route            | Type | Purpose                                    |
| ---------------- | ---- | ------------------------------------------ |
| `POST /mcp`      | MCP  | Streamable HTTP endpoint for MCP clients   |
| `GET /health`    | REST | Health check (`{ status: "ok" }`)          |
| `GET /pages`     | REST | List all sitemap paths                     |
| `GET /page`      | REST | Get page content as Markdown (`?path=...`) |
| `GET /page-html` | REST | Get raw article HTML (`?path=...`)         |

### MCP tools

| Tool         | What it does                                                                                |
| ------------ | ------------------------------------------------------------------------------------------- |
| `list_pages` | Fetches sitemap.xml, extracts all paths                                                     |
| `get_page`   | Playwright navigates to path, preprocesses HTML (see below), converts via `AI.toMarkdown()` |

## Commands

```bash
pnpm install                # install deps (use pnpm add/add -D, never edit package.json)
pnpm dev                    # wrangler dev (local dev server)
pnpm check                  # tsc --noEmit
pnpm lint                   # eslint .
pnpm lint:fix               # eslint --fix .
pnpm format                 # prettier --check .
pnpm format:fix             # prettier --write .
pnpm deploy                 # wrangler deploy
pnpm run gen:cf-types       # regenerate worker-configuration.d.ts from wrangler.jsonc
```

### CI verification order

CI runs format → lint → typecheck as separate jobs. Typecheck requires `pnpm run gen:cf-types` first.

## Codegen

`wrangler types` generates `worker-configuration.d.ts` from `wrangler.jsonc`. **Rerun after any binding change.** The file is gitignored.

## Lint / style

- ESLint with `perfectionist` plugin enforces **alphabetical ordering** on imports, exports, objects, etc.
- Use `// @sort` comments to partition sorting within a block (perfectionist `partitionByComment: "^@sort"`).
- Prettier: 4-space indent, double quotes, trailing commas.
- No tests exist in this repo.

## Critical implementation details

- `m3.material.io` is a JS-heavy SPA. The `<article>` tag renders client-side, so `page.waitForSelector("article")` is mandatory after `page.goto()`.
- `get_page` preprocessing removes copy buttons/icons, replaces `<video>` with `<img>`, and expands interactive spec tables (`<token-viewer>`) into static HTML before converting to Markdown.
- Input validation uses Zod schemas (`GetPageSchema`).

## Environment

Nix flake provides Node.js + corepack (direnv loads it via `.envrc`). The `pnpm-workspace.yaml` allows builds only for `esbuild`, `sharp`, and `workerd`.
