import type { ToolCallback } from "@modelcontextprotocol/server";

import puppeteer from "@cloudflare/puppeteer";
import { env } from "cloudflare:workers";
import z from "zod";

import { BASE_URL } from "./constants";
import { handle, text } from "./util";

export const GetPageSchema = z.object({
    path: z
        .string()
        .describe(
            "The URL path on m3.material.io to navigate to (e.g. '/foundations/overview').",
        ),
});

export const getPage: ToolCallback<typeof GetPageSchema> = async ({ path }) => {
    const browser = await puppeteer.launch(env.BROWSER);

    return await handle(
        async () => {
            const page = await browser.newPage();
            const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

            await page.goto(url);
            await page.waitForSelector("article");

            const articleHtml = await page.$eval(
                "article",
                (article) => article.outerHTML,
            );

            if (!articleHtml)
                return text(
                    `No <article> tag found on ${url}. The page may not exist or has an unexpected layout.`,
                    true,
                );

            const blob = new Blob([articleHtml], { type: "text/html" });

            const result = await env.AI.toMarkdown({
                blob,
                name: "page.html",
            });

            if (result.format === "error")
                return text(
                    `Markdown conversion failed: ${result.error}`,
                    true,
                );

            return text(result.data);
        },
        async () => await browser.close(),
    );
};
