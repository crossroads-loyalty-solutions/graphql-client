/* @flow */

import { parseError, queryError, requestError } from "./error";

/**
 * A GraphQLClient with the possible options O.
 */
export type Client<O> = {
  size: () => number,
  query: <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    options?: O
  ) => Promise<GraphQLResult<R>>,
  wait: () => Promise<void>,
};

export type GraphQLError = {
  +message: string,
};

export type GraphQLErrorResponse = {
  +data: null,
  +errors: Array<GraphQLError>,
};

export type GraphQLRequestBody = {
  +query: string,
  +variables: ?mixed,
};

export type GraphQLResponse<T: {}> = GraphQLResult<T> | GraphQLErrorResponse;

export type GraphQLResult<T: {}> = {
  +data: T,
  +errors?: Array<GraphQLError>,
};

/**
 * Query type with parameters `P` and return type `R` as phantom types.
 */
// eslint-disable-next-line no-unused-vars
export type Query<P, R> = string;

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

/**
 * Rejects any responses without any data, ie. they only contain errors.
 */
export const rejectErrorResponses = <R: {}>(res: GraphQLResponse<R>): GraphQLResult<R> => {
  if (!res.data) {
    throw queryError(res.errors);
  }

  return res;
};
