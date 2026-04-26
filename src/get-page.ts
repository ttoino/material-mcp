import puppeteer from "@cloudflare/puppeteer";
import { env } from "cloudflare:workers";
import z from "zod";

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

export const getPageHTML = async ({ path }: GetPageSchema) => {
    const browser = await puppeteer.launch(env.BROWSER);

    try {
        const page = await browser.newPage();
        const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

        await page.goto(url);
        await page.waitForSelector("article");

        await page.$$eval(".copy-button-container", (buttons) =>
            buttons.forEach((button) => button.remove()),
        );

        const articleHTML: string = await page.$eval(
            "article",
            (article) => article.outerHTML,
        );

        return articleHTML;
    } catch (err) {
        return catch_(err, "Error getting page HTML");
    } finally {
        await browser.close();
    }
};

export const getPage = async ({ path }: GetPageSchema) => {
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

        return result.data;
    } catch (err) {
        return catch_(err, "Error getting page");
    }
};
