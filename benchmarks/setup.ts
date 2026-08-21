import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";

const SEED_COUNT = 1_000_000;

const ROLES = ["admin", "user", "moderator", "guest"];

export async function setup() {
  const client = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
  const db = drizzle(client);

  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER NOT NULL,
    role TEXT NOT NULL,
    api_key UUID NOT NULL
  )`);

  const result = await client.unsafe<{ count: string }[]>(`SELECT COUNT(*) as count FROM users`);
  const count = Number(result[0]?.count ?? 0);

  if (count < SEED_COUNT) {
    console.log(`seeding ${SEED_COUNT} rows...`);
    await db.delete(users);

    const batch = 10_000;
    for (let offset = 0; offset < SEED_COUNT; offset += batch) {
      const values = Array.from({ length: batch }, (_, i) => {
        const n = offset + i + 1;
        return {
          name: `user-${n}`,
          email: `user${n}@example.com`,
          age: 18 + (n % 60),
          role: ROLES[n % ROLES.length],
          apiKey: crypto.randomUUID(),
        };
      });
      await db.insert(users).values(values);

      if ((offset + batch) % 100_000 === 0 || offset + batch >= SEED_COUNT) {
        console.log(`  seeded ${Math.min(offset + batch, SEED_COUNT)}/${SEED_COUNT}`);
      }
    }

    console.log(`seeded ${SEED_COUNT} rows`);
  } else {
    console.log(`table has ${count} rows, skipping seed`);
  }

  return { db, client };
}

export function randomId() {
  return Math.floor(Math.random() * SEED_COUNT) + 1;
}
