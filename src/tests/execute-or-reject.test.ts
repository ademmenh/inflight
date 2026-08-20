import { test, expect } from "bun:test";
import { InFlight, InFlightConflictError } from "../inflight";

test("first call executes", async () => {
  const inflight = new InFlight();

  expect(inflight.size).toBe(0);

  const result = await inflight.executeOrReject({
    queryKey: "k",
    queryFunction: () => Promise.resolve("ok"),
  });

  expect(result).toBe("ok");
  expect(inflight.size).toBe(0);
});

test("second call while in-flight → rejects with InFlightConflictError", async () => {
  const inflight = new InFlight();

  let resolve!: () => void;
  const p1 = inflight.executeOrReject({
    queryKey: "k",
    queryFunction: () => new Promise<string>((r) => (resolve = r)),
  });
  expect(inflight.size).toBe(1);

  const p2 = inflight.executeOrReject({
    queryKey: "k",
    queryFunction: () => Promise.resolve("should not run"),
  });
  expect(inflight.size).toBe(1);

  await expect(p2).rejects.toThrow(InFlightConflictError);
  await expect(p2).rejects.toThrow('inflight conflict for "k"');

  resolve();
  expect(await p1).toBe(undefined);
  expect(inflight.size).toBe(0);
});

test("rejects with correct queryKey", async () => {
  const inflight = new InFlight();

  let resolve!: () => void;
  inflight.executeOrReject({
    queryKey: "my-key",
    queryFunction: () => new Promise<void>((r) => (resolve = r)),
  });

  try {
    await inflight.executeOrReject({
      queryKey: "my-key",
      queryFunction: () => Promise.resolve(),
    });
    expect.unreachable();
  } catch (e) {
    expect(e).toBeInstanceOf(InFlightConflictError);
    expect((e as InFlightConflictError).queryKey).toBe("my-key");
  }

  resolve();
});

test("different keys → both execute", async () => {
  const inflight = new InFlight();

  const [a, b] = await Promise.all([
    inflight.executeOrReject({ queryKey: "a", queryFunction: () => Promise.resolve(1) }),
    inflight.executeOrReject({ queryKey: "b", queryFunction: () => Promise.resolve(2) }),
  ]);

  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(inflight.size).toBe(0);
});

test("after completion → can execute again", async () => {
  const inflight = new InFlight();
  let callCount = 0;

  const fn = async () => ++callCount;

  const a = await inflight.executeOrReject({ queryKey: "k", queryFunction: fn });
  expect(a).toBe(1);
  expect(inflight.size).toBe(0);

  const b = await inflight.executeOrReject({ queryKey: "k", queryFunction: fn });
  expect(b).toBe(2);
  expect(inflight.size).toBe(0);
});

test("after rejection → can execute again", async () => {
  const inflight = new InFlight();

  await expect(
    inflight.executeOrReject({
      queryKey: "k",
      queryFunction: () => Promise.reject(new Error("boom")),
    }),
  ).rejects.toThrow("boom");
  expect(inflight.size).toBe(0);

  const result = await inflight.executeOrReject({
    queryKey: "k",
    queryFunction: () => Promise.resolve("ok"),
  });
  expect(result).toBe("ok");
  expect(inflight.size).toBe(0);
});

test("concurrent callers get same rejection", async () => {
  const inflight = new InFlight();

  let resolve!: () => void;
  inflight.executeOrReject({
    queryKey: "k",
    queryFunction: () => new Promise<void>((r) => (resolve = r)),
  });

  const p1 = inflight.executeOrReject({ queryKey: "k", queryFunction: () => Promise.resolve() });
  const p2 = inflight.executeOrReject({ queryKey: "k", queryFunction: () => Promise.resolve() });

  const [r1, r2] = await Promise.allSettled([p1, p2]);
  expect(r1.status).toBe("rejected");
  expect(r2.status).toBe("rejected");

  const e1 = (r1 as PromiseRejectedResult).reason as InFlightConflictError;
  const e2 = (r2 as PromiseRejectedResult).reason as InFlightConflictError;
  expect(e1).toBeInstanceOf(InFlightConflictError);
  expect(e2).toBeInstanceOf(InFlightConflictError);
  expect(e1.queryKey).toBe(e2.queryKey);

  resolve();
});
