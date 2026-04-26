import { CallToolResult } from "@modelcontextprotocol/server";

export const text = (text: string, isError?: boolean): CallToolResult => ({
    content: [
        {
            text,
            type: "text",
        },
    ],
    isError,
});

export const handle = async (
    try_: () => CallToolResult | Promise<CallToolResult>,
    finally_?: () => Promise<unknown> | unknown,
) => {
    try {
        return await try_?.();
    } catch (err) {
        return text(
            `Error listing sections: ${err instanceof Error ? err.message : String(err)}`,
            true,
        );
    } finally {
        await finally_?.();
    }
};
