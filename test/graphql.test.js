/* @flow */

import ava from "ava";
import ninos from "ninos";

import { createInit } from "../src/graphql";

const test = ninos(ava);

test("createInit", t => {
  t.deepEqual(
    createInit({ query: "foo", variables: undefined }),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: `{"query":"foo"}` }
  );
  t.deepEqual(
    createInit({ query: "foo", variables: { bar: "baz" } }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"query":"foo","variables":{"bar":"baz"}}`,
    }
  );
  t.deepEqual(
    createInit([{ query: "foo", variables: { bar: "baz" } }]),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `[{"query":"foo","variables":{"bar":"baz"}}]`,
    }
  );
});
