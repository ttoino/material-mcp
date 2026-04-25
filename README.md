# Material Design MCP Server

A Cloudflare Worker that exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for browsing the [Material Design 3](https://m3.material.io/) documentation.

## Features

- **`list_sections`** — Discover top-level documentation sections (Foundations, Components, Styles, etc.)
- **`get_page`** — Navigate any Material Design page and get its content as clean Markdown

## Architecture

- **Runtime**: Cloudflare Workers (TypeScript, `nodejs_compat`)
- **Router**: [Hono](https://hono.dev/)
- **Browser automation**: [Browser Run](https://developers.cloudflare.com/browser-run/) (Puppeteer binding)
- **Markdown conversion**: [Workers AI](https://developers.cloudflare.com/workers-ai/) `toMarkdown()`
- **MCP transport**: Streamable HTTP (`@modelcontextprotocol/server` v2)

Because `m3.material.io` is a JavaScript-heavy SPA, the worker uses Puppeteer to wait for the client-side `<article>` element to render before extracting content.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- A [Cloudflare](https://dash.cloudflare.com/) account with:
  - **Browser Run** enabled
  - **Workers AI** enabled

## Setup

```bash
# Install dependencies
pnpm install

# Generate TypeScript types from wrangler.jsonc
pnpm run gen:cf-types
```

## Development

```bash
# Start local dev server (connects to remote Cloudflare services)
pnpm dev
```

The MCP endpoint is available at `http://localhost:8787/mcp`.

## Deployment

```bash
pnpm deploy
```

## MCP Tools

### `list_sections`

Returns the top-level documentation sections from the Material Design sitemap.

**Input:** none

**Example output:**

```txt
blog
components
develop
foundations
get-started
styles
```

### `get_page`

Navigates to a specific Material Design page, extracts the article content, and converts it to Markdown.

**Input:**

- `path` — URL path on `m3.material.io` (e.g. `/foundations/overview`)

**Example output:**

```markdown
## Accessibility & Material Design

**Accessibility by default** is a core design value for Material...
```

## Connect an MCP Client

Any MCP client that supports Streamable HTTP can connect to:

```url
https://<your-worker>.<your-subdomain>.workers.dev/mcp
```

For example, with [Claude Desktop](https://claude.ai/download):

```json
{
    "mcpServers": {
        "material-design": {
            "url": "https://material-mcp.your-account.workers.dev/mcp"
        }
    }
}
```

## License

[MIT](LICENSE)
