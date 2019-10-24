/* @flow */

import ava from "ava";
import ninos from "ninos";

import { createCache } from "../src/cache";
// import { createFetchStub } from "./util";

const test = ninos(ava);

test("cache", async t => {
  const cache = createCache(3);

  t.is(cache.get("foo"), undefined);
  t.is(cache.set("foo", 1), undefined);
  t.is(cache.get("foo"), 1);
  t.is(cache.set("bar", 2), undefined);
  t.is(cache.set("baz", 3), undefined);
  t.is(cache.get("foo"), 1);
  t.is(cache.get("bar"), 2);
  t.is(cache.get("baz"), 3);
  t.is(cache.set("lol", 4), undefined);
  t.is(cache.get("foo"), undefined);
  t.is(cache.get("bar"), 2);
  t.is(cache.get("baz"), 3);
  t.is(cache.get("lol"), 4);
  t.is(cache.dropValue(3), undefined);
  t.is(cache.get("baz"), undefined);
  t.is(cache.dropValue(3), undefined);
  t.is(cache.dropKey("foo"), undefined);
  t.is(cache.dropKey("bar"), undefined);
  t.is(cache.get("bar"), undefined);
  t.is(cache.get("lol"), 4);
  t.is(cache.set("lol", 5), undefined);
  t.is(cache.get("lol"), 5);
});
