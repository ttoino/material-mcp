import type { ToolCallback } from "@modelcontextprotocol/server";

import { BASE_URL } from "./constants";
import { handle, text } from "./util";

export const listSections: ToolCallback = async () =>
    await handle(async () => {
        const res = await fetch(`${BASE_URL}/sitemap.xml`);
        if (!res.ok)
            return text(
                `Failed to fetch sitemap: ${res.status} ${res.statusText}`,
                true,
            );

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
        return text(
            sections.length > 0 ? sections.join("\n") : "No sections found.",
        );
    });
