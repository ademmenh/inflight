import { test, expect } from "bun:test";
import { InFlight } from "../inflight";

test("two simultaneous calls with same key → queryFunction called once", async () => {
    const inflight = new InFlight();
    let callCount = 0;

    let resolve!: () => void;
    const queryFunction = async () => {
        callCount++;
        await new Promise<void>((r) => (resolve = r));
        return "result";
    };

    expect(inflight.size).toBe(0);

    const p1 = inflight.execute({ queryKey: "k", queryFunction });
    expect(inflight.size).toBe(1);

    const p2 = inflight.execute({ queryKey: "k", queryFunction });
    expect(inflight.size).toBe(1);

    resolve();
    const [a, b] = await Promise.all([p1, p2]);

    expect(a).toBe("result");
    expect(b).toBe("result");
    expect(callCount).toBe(1);
    expect(inflight.size).toBe(0);
});

test("calls with different keys → both execute", async () => {
    const inflight = new InFlight();
    let callCount = 0;

    let resolveA!: () => void;
    let resolveB!: () => void;

    const fnA = async () => {
        callCount++;
        await new Promise<void>((r) => (resolveA = r));
        return 1;
    };

    const fnB = async () => {
        callCount++;
        await new Promise<void>((r) => (resolveB = r));
        return 2;
    };

    expect(inflight.size).toBe(0);

    const pA = inflight.execute({ queryKey: "a", queryFunction: fnA });
    expect(inflight.size).toBe(1);

    const pB = inflight.execute({ queryKey: "b", queryFunction: fnB });
    expect(inflight.size).toBe(2);

    resolveA();
    const a = await pA;
    expect(inflight.size).toBe(1);

    resolveB();
    const b = await pB;
    expect(inflight.size).toBe(0);

    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(callCount).toBe(2);
});

test("promise resolves → key is removed", async () => {
    const inflight = new InFlight();

    expect(inflight.size).toBe(0);

    const p = inflight.execute({
        queryKey: "k",
        queryFunction: () => Promise.resolve(1),
    });
    expect(inflight.size).toBe(1);

    await p;

    expect(inflight.has("k")).toBe(false);
    expect(inflight.size).toBe(0);
});

test("promise rejects → key is removed", async () => {
    const inflight = new InFlight();

    expect(inflight.size).toBe(0);

    const p = inflight.execute({
        queryKey: "k",
        queryFunction: () => Promise.reject(new Error("boom")),
    });
    expect(inflight.size).toBe(1);

    await expect(p).rejects.toThrow("boom");

    expect(inflight.has("k")).toBe(false);
    expect(inflight.size).toBe(0);
});

test("new call after rejection → executes again", async () => {
    const inflight = new InFlight();
    let callCount = 0;

    const queryFunction = async () => {
        callCount++;
        if (callCount === 1) throw new Error("boom");
        return "ok";
    };

    expect(inflight.size).toBe(0);

    await expect(
        inflight.execute({ queryKey: "k", queryFunction }),
    ).rejects.toThrow("boom");
    expect(inflight.size).toBe(0);

    const promise = inflight.execute({ queryKey: "k", queryFunction });
    expect(inflight.size).toBe(1);
    const result = await promise;

    expect(inflight.size).toBe(0);

    expect(result).toBe("ok");
    expect(callCount).toBe(2);
});

test("new call after successful completion → executes again", async () => {
    const inflight = new InFlight();
    let callCount = 0;

    const queryFunction = async () => ++callCount;

    expect(inflight.size).toBe(0);

    const a = await inflight.execute({ queryKey: "k", queryFunction });
    expect(inflight.size).toBe(0);

    const b = await inflight.execute({ queryKey: "k", queryFunction });
    expect(inflight.size).toBe(0);

    expect(a).toBe(1);
    expect(b).toBe(2);
});

test("concurrent callers receive exactly the same result/error", async () => {
    const inflight = new InFlight();

    expect(inflight.size).toBe(0);

    const p1 = inflight.execute({
        queryKey: "k",
        queryFunction: () => Bun.sleep(10).then(() => ({ ts: Date.now() })),
    });
    expect(inflight.size).toBe(1);

    const p2 = inflight.execute({
        queryKey: "k",
        queryFunction: () => Bun.sleep(10).then(() => ({ ts: Date.now() })),
    });
    expect(inflight.size).toBe(1);

    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(inflight.size).toBe(0);

    const err = new Error("boom");
    const ep1 = inflight.execute({
        queryKey: "e",
        queryFunction: () => Promise.reject(err),
    });
    expect(inflight.size).toBe(1);

    const ep2 = inflight.execute({
        queryKey: "e",
        queryFunction: () => Promise.reject(err),
    });
    expect(inflight.size).toBe(1);

    const [r1, r2] = await Promise.allSettled([ep1, ep2]);
    expect(inflight.size).toBe(0);
    expect(r1.status).toBe("rejected");
    expect(r2.status).toBe("rejected");
    expect((r1 as PromiseRejectedResult).reason).toBe(
        (r2 as PromiseRejectedResult).reason,
    );
});
