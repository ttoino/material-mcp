import { McpServer } from "@modelcontextprotocol/server";

import { getPage, GetPageSchema } from "./get-page";
import { listSections } from "./list-sections";

export const mcp = new McpServer({
    name: "material-design-mcp",
    version: "0.0.1",
});

mcp.registerTool(
    "list_sections",
    {
        description:
            "List the top-level documentation sections available on the Material Design 3 website (m3.material.io).",
    },
    listSections,
);

mcp.registerTool(
    "get_page",
    {
        description:
            "Navigate to a page on the Material Design 3 website (m3.material.io), extract the article content, and return it as Markdown.",
        inputSchema: GetPageSchema,
    },
    getPage,
);
