/* @flow */

import type { GraphQLClient } from "../src";

import ava from "ava";
import ninos from "ninos";

import { createClient, handleResponse } from "../src/fetch";
import { createFetchStub } from "./util";

const test = ninos(ava);

test("handleResponse JSON", async t => {
  const resp = {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ data: "foobar" })),
  };
  const r = await handleResponse((resp: any));

  t.deepEqual(r, { data: "foobar" });
});

test("handleResponse invalid JSON", async t => {
  const resp = {
    ok: true,
    status: 200,
    text: () => Promise.resolve("{ foo"),
  };

  try {
    await handleResponse((resp: any));

    t.fail("handleResponse did not reject invalid JSON");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(String(e), "ParseError: SyntaxError: Unexpected token f in JSON at position 2");
    t.is(e.name, "ParseError");
    t.is(e.bodyText, "{ foo");
    t.is(e.statusCode, 200);
    t.is(e.response, resp);
  }
});

test("handleResponse non-ok response", async t => {
  const resp = {
    ok: false,
    // On purpose:
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ foo: "bar" })),
  };

  try {
    await handleResponse((resp: any));

    t.fail("handleResponse did not reject bad-response");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(String(e), "RequestError: Received status code 200");
    t.is(e.name, "RequestError");
    t.is(e.bodyText, `{"foo":"bar"}`);
    t.is(e.statusCode, 200);
    t.is(e.response, resp);
  }
});

test("handleResponse non-ok response 2", async t => {
  const resp = {
    ok: false,
    status: 404,
    text: () => Promise.resolve(JSON.stringify({ foo: "bar" })),
  };

  try {
    await handleResponse((resp: any));

    t.fail("handleResponse did not reject bad-response");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(String(e), "RequestError: Received status code 404");
    t.is(e.name, "RequestError");
    t.is(e.bodyText, `{"foo":"bar"}`);
    t.is(e.statusCode, 404);
    t.is(e.response, resp);
  }
});

test("handleResponse throw on text-read", async t => {
  const err = new Error("Test Error");

  try {
    await handleResponse(({
      ok: true,
      status: 200,
      text: () => Promise.reject(err),
    }: any));

    t.fail("Rejection was not propagated");
  }
  catch (e) {
    t.is(e, err);
  }
});

test("client", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: JSON.stringify({ data: { foo: "bar" } }),
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify({ data: { another: "bar" } }),
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  // Type test:
  (client: GraphQLClient);

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
    body: `{"query":"foobar","variables":{"lol":"baz"}}`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);

  t.deepEqual(
    await client.query("foo", null, { rejectAnyError: true }),
    { data: { another: "bar" } }
  );

  t.is(fetch.calls.length, 2);
  t.deepEqual(fetch.calls[1].arguments, ["foo", {
    body: `{"query":"foo"}`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);
});

test("client errors", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: false,
      // Intentional:
      status: 200,
      text: "Some error",
    },
    {
      ok: false,
      status: 404,
      text: "This was not found",
    },
    {
      ok: true,
      status: 200,
      text: "This is not JSON",
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify({ errors: [{ message: "This went wrong" }], data: null }),
    },
    {
      ok: false,
      status: 500,
      text: {
        // Simulate Promise to avoid unhandled rejection since this promise
        // will persist in a generator otherwise
        then: (onResolved, onError) =>
          setTimeout(() => onError(new Error("Failed to read")), 0),
      },
    },
  ]);

  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  try {
    await client.query("baz");

    t.fail("Response = { ok: false, status: 200 } did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.statusCode, 200);
    t.is(e.name, "RequestError");
    t.is(e.bodyText, "Some error");
  }

  try {
    await client.query("bar");

    t.fail("Response = { ok: false, status: 404 } did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "RequestError");
    t.is(e.statusCode, 404);
    t.is(e.bodyText, "This was not found");
  }

  try {
    await client.query("foo");

    t.fail("Response with invalid JSON did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "ParseError");
    t.is(e.statusCode, 200);
    t.is(e.bodyText, "This is not JSON");
  }

  try {
    await client.query("foo");

    t.fail("Response with only errors did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "QueryError");
    t.is(String(e), "QueryError: This went wrong");
    t.deepEqual(e.errors, [{ message: "This went wrong" }]);
  }

  try {
    await client.query("foo");

    t.fail("Response with failed read did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "Error");
    t.is(String(e), "Error: Failed to read");
  }
});
