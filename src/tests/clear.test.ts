import { test, expect } from "bun:test";
import { InFlight} from "../inflight";


const never = () => new Promise(() => {});

test("clearOne('') removes only the empty-string key", () => {
  const inflight = new InFlight();
  inflight.execute({ queryKey: "", queryFunction: never });
  inflight.execute({ queryKey: "a", queryFunction: never });

  inflight.clearOne("");

  expect(inflight.has("")).toBe(false);
  expect(inflight.has("a")).toBe(true);
});

test("clearAll() removes every key", () => {
  const inflight = new InFlight();
  inflight.execute({ queryKey: "", queryFunction: never });
  inflight.execute({ queryKey: "a", queryFunction: never });

  inflight.clearAll();

  expect(inflight.size).toBe(0);
})