import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { mcp } from "./mcp";

const app = new Hono();

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

export default app;
