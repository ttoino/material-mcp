import { BASE_URL } from "./constants";
import { catch_, MMError } from "./error";

export const listSections = async () => {
    try {
        const res = await fetch(`${BASE_URL}/sitemap.xml`);
        if (!res.ok)
            throw new MMError(
                500,
                `Failed to fetch sitemap: ${res.status} ${res.statusText}`,
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
        return sections.length > 0 ? sections.join("\n") : "No sections found.";
    } catch (err) {
        return catch_(err, "Error listing sections");
    }
};
