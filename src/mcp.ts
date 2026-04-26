import { CallToolResult, McpServer } from "@modelcontextprotocol/server";

import { getPage, GetPageSchema } from "./get-page";
import { listPages } from "./list-pages";

export const mcp = new McpServer({
    name: "material-design-mcp",
    version: "0.0.1",
});

const handle =
    <Input>(fn: (input: Input) => Promise<string>) =>
    async (input: Input): Promise<CallToolResult> => {
        try {
            const result = await fn(input);

            return {
                content: [
                    {
                        text: result,
                        type: "text",
                    },
                ],
            };
        } catch (err) {
            return {
                content: [
                    {
                        text: err instanceof Error ? err.message : String(err),
                        type: "text",
                    },
                ],
                isError: true,
            };
        }
    };

mcp.registerTool(
    "list_pages",
    {
        description:
            "List all documentation pages available on the Material Design 3 website (m3.material.io).",
    },
    handle(listPages),
);

mcp.registerTool(
    "get_page",
    {
        description:
            "Navigate to a page on the Material Design 3 website (m3.material.io), extract the article content, and return it as Markdown.",
        inputSchema: GetPageSchema,
    },
    handle(getPage),
);
