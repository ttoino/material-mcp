import { type ElementHandle, launch, type Page } from "@cloudflare/playwright";
import { env } from "cloudflare:workers";
import z from "zod";

import { getCached, setCached } from "./cache";
import { BASE_URL } from "./constants";
import { catch_, MMError } from "./error";

export const GetPageSchema = z.object({
    path: z
        .string()
        .describe(
            "The URL path on m3.material.io to navigate to (e.g. '/foundations/overview').",
        ),
});
export type GetPageSchema = z.infer<typeof GetPageSchema>;

type Handle = ElementHandle<HTMLElement | SVGElement>;

const replaceSpecTable = async (page: Page, table: Handle) => {
    let result = "<div>";

    const processToken = async (token: Handle) => {
        await token.click();

        const titleElement = await page.$(".token-title");
        const title = await titleElement?.evaluate((el) => el.textContent);

        const valueElement = await page.$(
            "token-value-resolutions-item .resolution-text",
        );
        const value = await valueElement?.evaluate((el) => el.textContent);

        result += `<li>${title}: ${value}</li>`;

        const closeButton = await page.$("button[aria-label='Close dialog']");
        await closeButton?.click();
    };

    const processTokenList = async (group: Handle) => {
        result += "<ul>";

        const list = await group.$("token-list");
        const tokens = await list?.$$(
            ".token-value-container:not(:has(.token-value-container))",
        );
        for (const token of tokens ?? []) await processToken(token);

        result += "</ul>";
    };

    const expandButton = await table.$(
        "button[aria-label='Toggle expand all']",
    );
    await expandButton?.click();

    const dropdownButton = await table.$(
        "button[aria-label='Token set selector']",
    );
    await dropdownButton?.click();

    const sets = await page.$$(".token-set-option");
    for (const set of sets) {
        const title = await set.evaluate((set) => set.textContent);
        result += `<h3>${title}</h3>`;

        await set.click();

        await processTokenList(table);

        const groups = await table.$$("display-group-item");
        for (const group of groups) {
            const nameEl = await group.$(".group-name");
            const title = await nameEl?.evaluate((el) => el.textContent);
            result += `<h4>${title}</h4>`;

            await processTokenList(group);
        }

        await dropdownButton?.click();
    }

    result += "</div>";
    await table.evaluate((table, result) => (table.outerHTML = result), result);
};

export const getPageHTML = async ({ path }: GetPageSchema) => {
    const cacheKey = `html:${path}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const browser = await launch(env.BROWSER);

    try {
        const page = await browser.newPage({
            viewport: { height: 1080, width: 1920 },
        });
        const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

        await page.goto(url);
        await page.waitForSelector("article");

        // Load all images
        const images = await page.$$("mio-image");
        for (const image of images) {
            await image.scrollIntoViewIfNeeded();
            await image.waitForSelector(
                "img:not(.blur-image):not(.image-loading)",
            );
        }

        // Remove copy buttons and icons
        await page.$$eval(
            ".copy-button-container, .google-symbols",
            (buttons) => buttons.forEach((button) => button.remove()),
        );

        // Replace videos with dummy images
        await page.$$eval("video", (videos) =>
            videos.forEach((video) => {
                const src = video.querySelector("source")?.src;
                const alt = video.ariaLabel;

                if (src && alt) {
                    const img = document.createElement("img");
                    img.src = src;
                    img.alt = alt;
                    video.replaceWith(img);
                }
            }),
        );

        // Replace interactive specs table with content
        const specTables = await page.$$("token-viewer");
        for (const table of specTables) await replaceSpecTable(page, table);

        const articleHTML = await page.$eval(
            "article",
            (article) => article.outerHTML,
        );

        await setCached(cacheKey, articleHTML);

        return articleHTML;
    } catch (err) {
        return catch_(err, "Error getting page HTML");
    } finally {
        await browser.close();
    }
};

export const getPage = async ({ path }: GetPageSchema) => {
    const cacheKey = `md:${path}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    try {
        const articleHTML = await getPageHTML({ path });

        const blob = new Blob([articleHTML], { type: "text/html" });

        const result = await env.AI.toMarkdown({
            blob,
            name: "page.html",
        });

        if (result.format === "error")
            throw new MMError(
                500,
                `Markdown conversion failed: ${result.error}`,
            );

        await setCached(cacheKey, result.data);

        return result.data;
    } catch (err) {
        return catch_(err, "Error getting page");
    }
};
