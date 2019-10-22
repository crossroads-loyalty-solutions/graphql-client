/* @flow */

import type {
  Client,
  Fetch,
  GraphQLResult,
  Query,
} from "./types";

import {
  createInit,
  createPromiseTracker,
  handleResponse,
} from "./util";

export type Options = {
  fetch: Fetch,
  endpoint: string,
};

export const createClient = ({ endpoint, fetch }: Options): Client<{}> => {
  const { add, size, wait } = createPromiseTracker();

  const query = <P, R: {}>(query: Query<P, R>, variables: P): Promise<GraphQLResult<R>> => {
    const req = fetch(endpoint, createInit({ query, variables }))
      .then(handleResponse);

    add(req);

    return req;
  };

  return {
    query,
    wait,
    size,
  };
};

