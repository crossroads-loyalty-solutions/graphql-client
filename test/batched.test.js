/* @flow */

import ava from "ava";
import ninos from "ninos";

import { createClient } from "../src/batched";
import { createFetchStub } from "./util";

const test = ninos(ava);

test("basic", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: [{ data: { foo: "bar" } }],
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  t.is(client.size(), 0);

  await client.wait();

  const r = client.query("foobar", { lol: "baz" });

  t.true(r instanceof Promise);
  t.is(client.size(), 1);

  const data = await r;

  t.is(client.size(), 0);
  t.deepEqual(data, { data: { foo: "bar" } });
  t.is(fetch.calls.length, 1);
  t.deepEqual(fetch.calls[0].arguments, ["foo", {
    body: `[{"query":"foobar","variables":{"lol":"baz"}}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);

  // TODO: More
});
