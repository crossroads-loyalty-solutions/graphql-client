/* @flow */

import type {
  Client,
  GraphQLResult,
  Query,
  RejectOptions,
} from "./graphql";

import { parseError, requestError } from "./error";
import { createInit, rejectAnyErrorResponse, rejectErrorResponse } from "./graphql";
import { createPromiseTracker } from "./promise";

export type Fetch = (input: string, init: RequestOptions) => Promise<Response>;

export type Options = {
  +fetch: Fetch,
  +endpoint: string,
};

/**
 * Basic response-handling, throws if the result is not ok or fails to parse.
 */
export const handleResponse = <R>(res: Response): Promise<R> =>
  res.text().then((bodyText: string): R => {
    if (!res.ok) {
      throw requestError(res, bodyText, `Received status code ${res.status}`);
    }

    try {
      // Since it is successful we assume we have GraphQL-data
      return JSON.parse(bodyText);
    }
    catch (e) {
      throw parseError(res, bodyText, e);
    }
  });

export const createClient = (
  { endpoint, fetch }: Options
): Client<RejectOptions> => {
  const { add, size, wait } = createPromiseTracker();

  const query = <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    { rejectAnyError = false }: RejectOptions = {}
  ): Promise<GraphQLResult<R>> => {
    const req = fetch(endpoint, createInit({ query, variables: variables || undefined }))
      .then(handleResponse)
      .then(rejectAnyError ? rejectAnyErrorResponse : rejectErrorResponse);

    add(req);

    return req;
  };

  return {
    query,
    wait,
    size,
  };
};

