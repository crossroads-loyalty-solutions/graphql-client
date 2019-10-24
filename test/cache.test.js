/* @flow */

import ava from "ava";
import ninos from "ninos";

import { createCache, createClient } from "../src/cache";

const test = ninos(ava);

test("cache", t => {
  const cache = createCache(3);

  t.is(cache.get({ test: "foo" }), undefined);
  t.is(cache.set({ test: "foo" }, 1), undefined);
  t.is(cache.get({ test: "foo" }), 1);
  t.is(cache.set({ test: "bar" }, 2), undefined);
  t.is(cache.set({ test: "baz" }, 3), undefined);
  t.is(cache.get({ test: "foo" }), 1);
  t.is(cache.get({ test: "bar" }), 2);
  t.is(cache.get({ test: "baz" }), 3);
  t.is(cache.set({ test: "lol" }, 4), undefined);
  t.is(cache.get({ test: "foo" }), undefined);
  t.is(cache.get({ test: "bar" }), 2);
  t.is(cache.get({ test: "baz" }), 3);
  t.is(cache.get({ test: "lol" }), 4);
  t.is(cache.dropValue(3), undefined);
  t.is(cache.get({ test: "baz" }), undefined);
  t.is(cache.dropValue(3), undefined);
  t.is(cache.dropKey({ test: "foo" }), undefined);
  t.is(cache.dropKey({ test: "bar" }), undefined);
  t.is(cache.get({ test: "bar" }), undefined);
  t.is(cache.get({ test: "lol" }), 4);
  t.is(cache.set({ test: "lol" }, 5), undefined);
  t.is(cache.get({ test: "lol" }), 5);
});

test("client", async t => {
  let i = 0;
  const a = { name: "a" };
  const b = { name: "b" };
  const c = { name: "c" };
  const d = { name: "d" };
  const e = { name: "e" };
  const responses = [a, b, c, d, e];
  const wait = t.context.stub(() => Promise.resolve(undefined));
  const size = t.context.stub(() => 0);
  const query = t.context.stub(() => Promise.resolve(responses[i++]));

  const client = createClient({ wait, size, query }, { size: 2 });

  // Ensure forwarded
  t.is(client.wait, wait);
  t.is(client.size, size);

  const aData = await client.query("foo", null, { cache: true });

  t.is(aData, a);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 1);
  t.deepEqual(query.calls[0].arguments, ["foo", null, { cache: true }]);

  const a2Data = await client.query("foo", null, { cache: true });

  t.is(a2Data, a);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 1);

  const bData = await client.query("foo", null);

  t.is(bData, b);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 2);
  t.deepEqual(query.calls[1].arguments, ["foo", null, undefined]);

  const cData = await client.query("bar", null, { cache: true });

  t.is(cData, c);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 3);
  t.deepEqual(query.calls[2].arguments, ["bar", null, { cache: true }]);

  const dData = await client.query("baz", null, { cache: true });

  t.is(dData, d);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 4);
  t.deepEqual(query.calls[3].arguments, ["baz", null, { cache: true }]);

  // Should have been evicted
  const eData = await client.query("foo", null, { cache: true });

  t.is(eData, e);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 5);
  t.deepEqual(query.calls[4].arguments, ["foo", null, { cache: true }]);

  const e2Data = await client.query("foo", undefined, { cache: true });

  t.is(e2Data, e);
  t.is(wait.calls.length, 0);
  t.is(size.calls.length, 0);
  t.is(query.calls.length, 5);
});

test("client rejection", async t => {
  let i = 0;
  const a = new Error("We failed");
  const b = { name: "b" };
  const responses = [
    // Fake promise
    {
      then: (onResolve, onReject) => setTimeout(() => onReject(a), 0),
      catch(onReject) {
        return this.then(x => x, onReject);
      },
    },
    Promise.resolve(b),
  ];
  const wait = t.context.stub(() => Promise.resolve(undefined));
  const size = t.context.stub(() => 0);
  const query = t.context.stub(() => responses[i++]);

  const client = createClient({ wait, size, query });

  try {
    await client.query("foo", null, { cache: true });

    t.fail("Faked promise did not throw");
  }
  catch (e) {
    t.is(e, a);
  }

  const data = await client.query("foo", null, { cache: true });

  t.is(data, b);
});
