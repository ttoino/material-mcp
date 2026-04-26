import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";

import { MMError } from "./error";
import { getPage, GetPageSchema } from "./get-page";
import { listSections } from "./list-sections";
import { mcp } from "./mcp";

export const app = new Hono();

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

const transport = new WebStandardStreamableHTTPServerTransport();

app.all("/mcp", async (c) => {
    if (!mcp.isConnected()) await mcp.connect(transport);

    return transport.handleRequest(c.req.raw);
});

const handle =
    <Input>(
        fn: (input: Input) => Promise<string>,
        Schema: z.ZodType<Input> = z.any(),
    ) =>
    async (c: Context) => {
        const input = Schema.safeParse(c.req.query());

        if (!input.success) return c.text("Invalid input", 401);

        try {
            const result = await fn(input.data);
            return c.text(result);
        } catch (err) {
            return c.text(
                err instanceof Error ? err.message : String(err),
                err instanceof MMError ? err.status : 500,
            );
        }
    };

app.get("/pages", handle(listSections));
app.get("/page", handle(getPage, GetPageSchema));
