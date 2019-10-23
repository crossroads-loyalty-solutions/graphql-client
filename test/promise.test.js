/* @flow */

import ava from "ava";
import ninos from "ninos";

import { resolved, createPromiseTracker } from "../src/promise";

const test = ninos(ava);

test("resolved", async t => {
  const data = await resolved;

  t.is(data, undefined);
});

test("PromiseTracker", async t => {
  const tracker = createPromiseTracker();

  t.is(tracker.size(), 0);

  const data1 = await tracker.wait();

  t.is(data1, undefined);
  t.is(tracker.size(), 0);

  tracker.add(Promise.resolve("foo"));

  // Just how promises work
  t.is(tracker.size(), 1);

  await tracker.wait();

  t.is(tracker.size(), 0);

  tracker.add(new Promise(resolve => {
    // Queue resolution
    setTimeout(resolve, 0);
  }));

  t.is(tracker.size(), 1);

  const data2 = await tracker.wait();

  t.is(data2, undefined);
  t.is(tracker.size(), 0);

  let resolveA;
  let resolveB;
  let isResolved = false;
  const a = new Promise(resolve => {
    resolveA = resolve;
  });
  const b = new Promise(resolve => {
    resolveB = resolve;
  });

  tracker.add(a);
  tracker.add(b);

  if (!resolveA || !resolveB) {
    throw new Error("Failed to init promises");
  }

  t.is(tracker.size(), 2);

  const p = tracker.wait().then(() => {
    isResolved = true;
  });

  t.is(tracker.size(), 2);
  t.is(isResolved, false);

  resolveB();

  await b;

  t.is(tracker.size(), 1);
  t.is(isResolved, false);

  resolveA();

  await a;

  t.is(tracker.size(), 0);
  t.is(isResolved, false);

  await p;

  t.is(tracker.size(), 0);
  t.is(isResolved, true);

  tracker.add(Promise.resolve("foo"));

  tracker.wait();
  tracker.wait();
  tracker.wait();

  t.is(tracker.size(), 1);

  await tracker.wait();

  t.is(tracker.size(), 0);
});

test("PromiseTracker throw", async t => {
  const tracker = createPromiseTracker();

  tracker.add(Promise.reject(new Error("Test Error")));

  t.is(tracker.size(), 1);

  const data = await tracker.wait();

  t.is(data, undefined);
  t.is(tracker.size(), 0);

  let resolveA;
  let rejectB;
  let isResolved = false;
  const a = new Promise(resolve => {
    resolveA = resolve;
  });
  const b = new Promise((resolve, reject) => {
    rejectB = reject;
  });

  tracker.add(a);
  tracker.add(b);

  if (!resolveA || !rejectB) {
    throw new Error("Failed to init promises");
  }

  t.is(tracker.size(), 2);

  const p = tracker.wait().then(() => {
    isResolved = true;
  });

  t.is(tracker.size(), 2);
  t.is(isResolved, false);

  rejectB();

  try {
    await b;

    t.fail("b did not throw");
  }
  catch (e) {
  }

  t.is(tracker.size(), 1);
  t.is(isResolved, false);

  resolveA();

  await a;

  t.is(tracker.size(), 0);
  t.is(isResolved, false);

  await p;

  t.is(tracker.size(), 0);
  t.is(isResolved, true);
});

test("PromiseTracker broken promise", async t => {
  const tracker = createPromiseTracker();

  const prOmiSe = {
    then: (a, b) => {
      setTimeout(a, 0);
      setTimeout(b, 0);
    },
  };

  tracker.add((prOmiSe: any));

  t.is(tracker.size(), 1);

  await tracker.wait();

  t.is(tracker.size(), 0);
});
