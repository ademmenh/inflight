import { eq } from "drizzle-orm";
import { users } from "./schema";
import { setup } from "./setup";
import IoValkey from "iovalkey";

const DURATION_MS = 30_000;
const CACHE_TTL_S = 5;
const CONCURRENCY = 100;
const UNIQUE_KEYS = 10;

export async function benchWithoutInflight() {
    const { db, client: pgClient } = await setup();
    const cache = new IoValkey(process.env.VALKEY_URL!);

    let dbCalls = 0;
    let cacheCalls = 0;

    async function queryDb(id: number) {
        dbCalls++;
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0]!;
    }

    async function cachedQuery(id: number) {
        const key = `user:${id}`;

        cacheCalls++;
        const cached = await cache.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await queryDb(id);
        await cache.set(key, JSON.stringify(result), "EX", CACHE_TTL_S);
        return result;
    }

    console.log(`without inflight:`);
    console.log(
        `duration: ${DURATION_MS / 1000}s | cache ttl: ${CACHE_TTL_S}s | concurrency: ${CONCURRENCY} | keys: ${UNIQUE_KEYS}`,
    );

    const start = performance.now();
    let totalQueries = 0;
    let running = true;

    setTimeout(() => {
        running = false;
    }, DURATION_MS);

    while (running) {
        await Promise.all(
            Array.from({ length: CONCURRENCY }, () => {
                const id =
                    (Math.floor(Math.random() * UNIQUE_KEYS) % UNIQUE_KEYS) + 1;
                return cachedQuery(id).then(() => {
                    totalQueries++;
                });
            }),
        );
    }

    const elapsed = performance.now() - start;
    const qps = ((totalQueries / elapsed) * 1000).toFixed(0);

    await cache.flushdb();
    await cache.quit();
    await pgClient.end();

    return { totalQueries, elapsed, dbCalls, cacheCalls };
}
