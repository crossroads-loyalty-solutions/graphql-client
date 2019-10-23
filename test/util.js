/* @flow */

import type { TestInterface } from "ava";
import type { Fetch } from "../src/fetch";

// Types from Ninos
type Call =
  | { this: any, arguments: Array<any>, return: any }
  | { this: any, arguments: Array<any>, throw: any };

type Stub<T> = T & { calls: Array<Call> };
type Spy<T> = T & { calls: Array<Call>, original: T };

type Ninos = {
  stub: <T: (...any) => any>(fn?: T) => Stub<T>,
  spy: (obj: {}, name: string) => Spy<(...any) => any>,
};

export type MockResponse = {
  ok: boolean,
  text: mixed,
  status: number,
};

/**
 * Helper creating a stub for `fetch` resolving to the supplied responses
 * in order.
 */
export const createFetchStub = (t: TestInterface<Ninos>, responses: Array<MockResponse>): Stub<Fetch> => {
  let i = 0;

  return t.context.stub(() => {
    if (i >= responses.length) {
      throw new Error("Unespected request");
    }

    const resp = responses[i++];
    const { text } = resp;

    return Promise.resolve({
      ...resp,
      text: () => Promise.resolve(JSON.stringify(text)),
    });
  });
};
