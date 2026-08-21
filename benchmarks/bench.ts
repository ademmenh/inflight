import { benchWithInflight } from "./inflight";
import { benchWithoutInflight } from "./no-inflight";

const withInflight = await benchWithInflight();

console.log("\n\n\n\n\n");

const withoutInflight = await benchWithoutInflight();

const qpsWith = (
    (withInflight.totalQueries / withInflight.elapsed) *
    1000
).toFixed(0);
const qpsWithout = (
    (withoutInflight.totalQueries / withoutInflight.elapsed) *
    1000
).toFixed(0);

function savedX(
    totalWith: number,
    totalWithout: number,
    callsWith: number,
    callsWithout: number,
) {
    return ((totalWith / totalWithout) * (callsWithout / callsWith)).toFixed(0);
}

console.log(`\n\nComparison:

with inflight
\tqps:\t\t\t~${qpsWith}
\ttotal queries:\t\t${withInflight.totalQueries}
\tdb calls:\t\t${withInflight.dbCalls}
\tcache calls:\t\t${withInflight.cacheCalls}

without inflight
\tqps:\t\t\t~${qpsWithout}
\ttotal queries:\t\t${withoutInflight.totalQueries}
\tdb calls:\t\t${withoutInflight.dbCalls}
\tcache calls:\t\t${withoutInflight.cacheCalls}

insights
\tdb calls saved:\t\tx${savedX(withInflight.totalQueries, withoutInflight.totalQueries, withInflight.dbCalls, withoutInflight.dbCalls)}
\tcache calls saved:\tx${savedX(withInflight.totalQueries, withoutInflight.totalQueries, withInflight.cacheCalls, withoutInflight.cacheCalls)}`);
