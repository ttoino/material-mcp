import { BASE_URL } from "./constants";
import { catch_, MMError } from "./error";

const LOC_REGEX = new RegExp(
    `<loc>[\\s\\n]*${RegExp.escape(BASE_URL)}/([^<\\s\\n]+)[\\s\\n]*</loc>`,
    "g",
);

export const listPages = async () => {
    try {
        const res = await fetch(`${BASE_URL}/sitemap.xml`);
        if (!res.ok)
            throw new MMError(
                500,
                `Failed to fetch sitemap: ${res.status} ${res.statusText}`,
            );

        const xml = await res.text();
        const paths = new Set<string>();

        const locMatches = xml.matchAll(LOC_REGEX);
        for (const match of locMatches) {
            const url = match[1];
            if (url !== "sitemap.xml") paths.add(url);
        }

        const sections = Array.from(paths).sort();
        return sections.length > 0 ? sections.join("\n") : "No sections found.";
    } catch (err) {
        return catch_(err, "Error listing sections");
    }
};
