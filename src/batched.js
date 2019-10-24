/* @flow */

import type {
  Client,
  GraphQLResponse,
  GraphQLResult,
  Query,
} from "./graphql";
import type { Fetch } from "./fetch";
import type { Reject, Resolve } from "./promise";

import { handleResponse } from "./fetch";
import { createInit, rejectAnyErrorResponse, rejectErrorResponse } from "./graphql";
import { createPromiseTracker, resolved } from "./promise";

export type Options = {
  fetch: Fetch,
  endpoint: string,
  debounceTime?: number,
};

type Pending<P, R> = {
  query: Query<P, R>,
  variables: P,
  resolve: (t: GraphQLResponse<R>) => void,
  reject: (e: Error) => void,
};

const extractQueryVariables = <P>(
  { query, variables }: Pending<P, any>
): { query: string, variables: P } =>
    ({ query, variables });

export const createClient = ({
  fetch,
  endpoint,
  debounceTime = 5,
}: Options): Client<{ rejectAnyError: boolean }> => {
  const { wait, add, size } = createPromiseTracker();

  let timer: ?TimeoutID = null;
  let pending: Array<Pending<any, any>> = [];
  let next = resolved;

  const runRequests = (requests: Array<Pending<any, any>>): Promise<void> =>
    fetch(endpoint, createInit(requests.map(extractQueryVariables)))
      .then(handleResponse)
      .then(
        // Group up the responses with their request promise
        (response: Array<GraphQLResponse<any>>): void =>
          requests.forEach(<P, R: {}>(req: Pending<P, R>, i: number): void =>
            req.resolve(response[i])),
        // Propagate to the errors to all promises
        (e: any): void => requests.forEach((req: Pending<any, any>): void =>
          req.reject(e)));

  const fire = (): void => {
    // We wait with clearing the timer until we have actually fired off the
    // reuqests to ensure we correctly manage the data
    next = next.then((): Promise<void> => {
      const r = runRequests(pending);

      // Clear now that we fired everything off
      pending = [];
      timer = null;

      return r;
    });
  };

  const query = <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    { rejectAnyError = false }: { rejectAnyError: boolean } = {}
  ): Promise<GraphQLResult<R>> => {
    const p = (new Promise((resolve: Resolve<GraphQLResponse<R>>, reject: Reject): void => {
      if (!timer) {
        timer = setTimeout(fire, debounceTime);
      }

      pending.push({
        query,
        variables,
        resolve,
        reject,
      });
    }))
      .then(rejectAnyError ? rejectAnyErrorResponse : rejectErrorResponse);

    add(p);

    return p;
  };

  return {
    query,
    size,
    wait,
  };
};
