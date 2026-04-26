import { env } from "cloudflare:workers";

const TTL_SECONDS = 7 * 24 * 60 * 60;

export const getCached = (key: string) => env.KV.get(key);

export const setCached = (key: string, value: string) =>
    env.KV.put(key, value, { expirationTtl: TTL_SECONDS });
