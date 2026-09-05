# inflight

Deduplicate concurrent requests by queryKey. When multiple identical queries are in-flight, only one executes — the rest wait for and receive the same result.

## Why

In high-concurrency environments, identical queries (same DB row, same cache key) accumulate while each one independently hits the database or cache. inflight collapses these into a single call.

## Install

```bash
bun add inflight
```

## Usage

```ts
import { InFlight } from "inflight";
import { eq } from "drizzle-orm";
import { users } from "./schema";
import IoValkey from "iovalkey";

const db = drizzle(pgClient);
const cache = new IoValkey(process.env.VALKEY_URL!);

const inflight = new InFlight();

async function getUser(id: number) {
  const cached = await inflight.execute({
    queryKey: `user:${id}:cache`,
    queryFunction: () => cache.get(`user:${id}`),
  });

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await inflight.execute({
    queryKey: `user:${id}:db`,
    queryFunction: async () => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      return result[0]!;
    },
  });

  await cache.set(
    `user:${id}`,
    JSON.stringify(result),
    "EX",
    5,
  );

  return result;
}
```

## Benchmarks

See [benchmarks/README.md](./benchmarks/README.md) for performance comparison with and without inflight.

## License

GPL-3.0-only
