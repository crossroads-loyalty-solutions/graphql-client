/* @flow */

import ava from "ava";
import ninos from "ninos";

import { handleResponse } from "../src/fetch";

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
