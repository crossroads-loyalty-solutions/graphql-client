/* @flow */

import ava from "ava";
import ninos from "ninos";

import { createClient } from "../src/batched";
import { createFetchStub } from "./util";

const test = ninos(ava);

test("single", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: JSON.stringify([{ data: { foo: "bar" } }]),
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify([{ data: { another: "bar" } }]),
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

  t.deepEqual(
    await client.query("foo", null, { rejectAnyError: true }),
    { data: { another: "bar" } }
  );

  t.is(fetch.calls.length, 2);
  t.deepEqual(fetch.calls[1].arguments, ["foo", {
    body: `[{"query":"foo","variables":null}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);
});

test("batching", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: JSON.stringify([
        { data: { foo: "bar" } },
        { data: { foo: "yes" } },
      ]),
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  const a = client.query("foobar", { lol: "bar" });

  t.is(client.size(), 1);

  const b = client.query("foobar", { lol: "yes" });

  t.is(client.size(), 2);

  t.deepEqual(await a, { data: { foo: "bar" } });
  t.deepEqual(await b, { data: { foo: "yes" } });

  t.is(client.size(), 0);
  t.is(fetch.calls.length, 1);
  t.deepEqual(fetch.calls[0].arguments, ["foo", {
    body: `[{"query":"foobar","variables":{"lol":"bar"}},{"query":"foobar","variables":{"lol":"yes"}}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);
});

test("batching with one error", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: JSON.stringify([
        { errors: [{ message: "An error" }], data: null },
        { data: { foo: "yes" } },
      ]),
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  const a = client.query("foobar", { lol: "bar" });

  t.is(client.size(), 1);

  const b = client.query("foobar", { lol: "yes" });

  t.is(client.size(), 2);

  // We do reverse order to test the order properly
  t.deepEqual(await b, { data: { foo: "yes" } });

  try {
    await a;

    t.fail("a did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "QueryError");
    t.is(String(e), "QueryError: An error");
    t.deepEqual(e.errors, [{ message: "An error" }]);
  }

  t.is(client.size(), 0);
  t.is(fetch.calls.length, 1);
  t.deepEqual(fetch.calls[0].arguments, ["foo", {
    body: `[{"query":"foobar","variables":{"lol":"bar"}},{"query":"foobar","variables":{"lol":"yes"}}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);
});

test("partial data", async t => {
  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text: JSON.stringify([
        { errors: [{ message: "An error" }], data: { some: "data" } },
      ]),
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify([
        { errors: [{ message: "Another error" }], data: { some: "yes" } },
      ]),
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
  });

  t.deepEqual(await client.query("foo"), { errors: [{ message: "An error" }], data: { some: "data" } });

  try {
    await client.query("foo", null, { rejectAnyError: true });
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "QueryError");
    t.is(String(e), "QueryError: Another error");
    t.deepEqual(e.errors, [{ message: "Another error" }]);
  }
});

test("errors", async t => {
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
      // Array since we batch
      text: JSON.stringify([{ errors: [{ message: "This went wrong" }], data: null }]),
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify([
        { errors: [{ message: "This went wrong" }], data: null },
        { errors: [{ message: "Another error" }], data: null },
      ]),
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

  const a = client.query("test");
  const b = client.query("another");

  try {
    await a;

    t.fail("Response with two errors did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "QueryError");
    t.is(String(e), "QueryError: This went wrong");
    t.deepEqual(e.errors, [{ message: "This went wrong" }]);
  }

  try {
    await b;

    t.fail("Response with two errors did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "QueryError");
    t.is(String(e), "QueryError: Another error");
    t.deepEqual(e.errors, [{ message: "Another error" }]);
  }

  const c = client.query("test");
  const d = client.query("another");

  try {
    await c;

    t.fail("Response with failed read did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "Error");
    t.is(String(e), "Error: Failed to read");
  }

  try {
    await d;

    t.fail("Response with failed read did not throw");
  }
  catch (e) {
    t.true(e instanceof Error);
    t.is(e.name, "Error");
    t.is(String(e), "Error: Failed to read");
  }
});

test("race", async t => {
  let resolveText;
  const text = new Promise(resolve => {
    resolveText = resolve;
  });

  if (!resolveText) {
    throw new Error("resolveText not set");
  }

  const fetch = createFetchStub(t, [
    {
      ok: true,
      status: 200,
      text,
    },
    {
      ok: true,
      status: 200,
      text: JSON.stringify([{ data: "bar" }, { data: "baz" }]),
    },
  ]);
  const client = createClient({
    fetch,
    endpoint: "foo",
    debounceTime: 0,
  });

  const a = client.query("foo");

  t.is(client.size(), 1);

  await new Promise(resolve => setTimeout(resolve, 5));

  t.is(fetch.calls.length, 1);
  t.deepEqual(fetch.calls[0].arguments, ["foo", {
    body: `[{"query":"foo"}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);
  t.is(client.size(), 1);

  const b = client.query("bar");
  const c = client.query("baz");

  t.is(client.size(), 3);

  await new Promise(resolve => setTimeout(resolve, 5));

  t.is(fetch.calls.length, 1);
  t.is(client.size(), 3);

  resolveText(JSON.stringify([{ data: "foo" }]));

  t.deepEqual(await a, { data: "foo" });

  t.is(client.size(), 2);

  await new Promise(resolve => setTimeout(resolve, 5));

  t.is(fetch.calls.length, 2);
  t.deepEqual(fetch.calls[1].arguments, ["foo", {
    body: `[{"query":"bar"},{"query":"baz"}]`,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }]);

  t.deepEqual(await b, { data: "bar" });
  t.deepEqual(await c, { data: "baz" });
});
