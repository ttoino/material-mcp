import puppeteer from "@cloudflare/puppeteer";
import {
    McpServer,
    WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as z from "zod";

const BASE_URL = "https://m3.material.io";

function createMcpServer(env: Env): McpServer {
    const server = new McpServer({
        name: "material-design-mcp",
        version: "0.0.1",
    });

    server.registerTool(
        "list_sections",
        {
            description:
                "List the top-level documentation sections available on the Material Design 3 website (m3.material.io).",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                const res = await fetch(`${BASE_URL}/sitemap.xml`);
                if (!res.ok)
                    return {
                        content: [
                            {
                                text: `Failed to fetch sitemap: ${res.status} ${res.statusText}`,
                                type: "text" as const,
                            },
                        ],
                        isError: true,
                    };

                const xml = await res.text();
                const paths = new Set<string>();

                const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
                for (const match of locMatches) {
                    const url = match[1];
                    if (!url.startsWith(BASE_URL)) continue;
                    const path = url.slice(BASE_URL.length);
                    const top = path.split("/")[1];
                    if (top && top !== "sitemap.xml") paths.add(top);
                }

                const sections = Array.from(paths).sort();
                return {
                    content: [
                        {
                            text:
                                sections.length > 0
                                    ? sections.join("\n")
                                    : "No sections found.",
                            type: "text" as const,
                        },
                    ],
                };
            } catch (err) {
                return {
                    content: [
                        {
                            text: `Error listing sections: ${err instanceof Error ? err.message : String(err)}`,
                            type: "text" as const,
                        },
                    ],
                    isError: true,
                };
            }
        },
    );

    server.registerTool(
        "get_page",
        {
            description:
                "Navigate to a page on the Material Design 3 website (m3.material.io), extract the article content, and return it as Markdown.",
            inputSchema: z.object({
                path: z
                    .string()
                    .describe(
                        "The URL path on m3.material.io to navigate to (e.g. '/foundations/overview').",
                    ),
            }),
        },
        async ({ path }) => {
            const browser = await puppeteer.launch(env.BROWSER);
            try {
                const page = await browser.newPage();
                const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

                await page.goto(url);
                await page.waitForSelector("article");

                const articleHtml = await page.$eval(
                    "article",
                    (article) => article.outerHTML,
                );

                if (!articleHtml)
                    return {
                        content: [
                            {
                                text: `No <article> tag found on ${url}. The page may not exist or has an unexpected layout.`,
                                type: "text" as const,
                            },
                        ],
                        isError: true,
                    };

                const blob = new Blob([articleHtml], { type: "text/html" });

                const result = await env.AI.toMarkdown({
                    blob,
                    name: "page.html",
                });

                if (result.format === "error")
                    return {
                        content: [
                            {
                                text: `Markdown conversion failed: ${result.error ?? "unknown error"}`,
                                type: "text" as const,
                            },
                        ],
                        isError: true,
                    };

                return {
                    content: [
                        {
                            text: result.data ?? "",
                            type: "text" as const,
                        },
                    ],
                };
            } catch (err) {
                return {
                    content: [
                        {
                            text: `Error fetching page: ${err instanceof Error ? err.message : String(err)}`,
                            type: "text" as const,
                        },
                    ],
                    isError: true,
                };
            } finally {
                await browser.close();
            }
        },
    );

    return server;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
    "*",
    cors({
        allowHeaders: [
            "Content-Type",
            "mcp-session-id",
            "Last-Event-ID",
            "mcp-protocol-version",
        ],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
        origin: "*",
    }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = createMcpServer(c.env);
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
});

export default app;
