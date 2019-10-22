/* @flow */

import type {
  Client,
  Fetch,
  GraphQLError,
  GraphQLResponse,
  GraphQLResult,
  Query,
  Reject,
  Resolve,
} from "./types";

import { queryError } from "./error";
import {
  createInit,
  createPromiseTracker,
  handleResponse,
  resolved,
} from "./util";

export type Options = {
  fetch: Fetch,
  endpoint: string,
  onErrors?: (e: Array<GraphQLError>) => void,
  debounceTime?: number,
};

type Pending<P, R> = {
  query: Query<P, R>,
  variables: P,
  resolve: (t: GraphQLResult<R>) => void,
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
}: Options): Client<{}> => {
  const { wait, add, size } = createPromiseTracker();

  let timer: ?TimeoutID = null;
  let pending: Array<Pending<any, any>> = [];
  let next = resolved;

  const runRequests = (requests: Array<Pending<any, any>>): Promise<void> =>
    fetch(endpoint, createInit(requests.map(extractQueryVariables)))
      .then(handleResponse)
      .then((response: Array<GraphQLResponse<any>>): void =>
        requests.forEach(<P, R: {}>(req: Pending<P, R>, i: number): void => {
          const res: GraphQLResponse<R> = response[i];

          if (!res.data) {
            const error = queryError(res.errors);

            req.reject(error);

            return;
          }

          // TODO: How do we handle errors here?

          req.resolve(res);
        }),
      // Propagate to the errors
      (e: any): void => requests.forEach(({ reject }: Pending<any, any>): void => reject(e)));

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

  // TODO: Add possibility to skip the batching?
  const query = <P, R: {}>(query: Query<P, R>, variables: P): Promise<GraphQLResult<R>> => {
    const p = new Promise((resolve: Resolve<GraphQLResult<R>>, reject: Reject): void => {
      if (!timer) {
        timer = setTimeout(fire, debounceTime);
      }

      pending.push({
        query,
        variables,
        resolve,
        reject,
      });
    });

    add(p);

    return p;
  };

  return {
    query,
    size,
    wait,
  };
};
