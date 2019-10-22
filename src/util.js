/* @flow */

import type { GraphQLRequestBody, Resolve } from "./types";

import {
  requestError,
  parseError,
} from "./error";

export type PromiseTracker = {
  add: (req: Promise<any>) => void,
  size: () => number,
  wait: () => Promise<void>,
};

export const resolved: Promise<void> =
  new Promise((resolve: Resolve<void>): void => resolve(undefined));

export const createInit = (
  request: GraphQLRequestBody | Array<GraphQLRequestBody>
): RequestOptions =>
  ({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

export const handleResponse = <R>(res: Response): Promise<R> =>
  res.text().then((bodyText: string): R => {
    if (!res.ok) {
      throw requestError(res, bodyText, `Received status code {res.status}.`);
    }

    try {
      // Since it is successful we assume we have GraphQL-data
      return JSON.parse(bodyText);
    }
    catch (e) {
      throw parseError(res, bodyText, e);
    }
  });

export const createPromiseTracker = (): PromiseTracker => {
  const inflight = [];
  let waiting = [];

  // TODO: How to manage errors?
  const done = (): void => {
    for (const i of waiting) {
      i();
    }

    waiting = [];
  };

  const add = (req: Promise<any>): void => {
    const drop = (): void => {
      const i = inflight.indexOf(req);

      if (i !== -1) {
        inflight.splice(i, 1);
      }

      if (inflight.length === 0) {
        done();
      }
    };

    inflight.push(req);
    // TODO: How to manage errors?
    req.then(drop, drop);
  };

  const size = (): number =>
    inflight.length;

  const wait = (): Promise<void> => {
    if (inflight.length > 0) {
      return new Promise((resolve: Resolve<void>): void => {
        waiting.push(resolve);
      });
    }

    return resolved;
  };

  return {
    wait,
    add,
    size,
  };
};
