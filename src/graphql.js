/* @flow */

import { queryError } from "./error";

/**
 * A GraphQLClient with the possible options O.
 */
export type Client<-O> = {
  size: () => number,
  query: <P, R: {}>(
    query: Query<P, R>,
    variables: $ReadOnly<P>,
    options?: $ReadOnly<O>
  ) => Promise<GraphQLResult<R>>,
  wait: () => Promise<void>,
};

export type TypeofClientOptions<+C: Client<any>> =
  $Call<<T, D: Client<T>>(D) => T, C>;

export type RejectOptions = {
  /**
   * If set to true the client will throw on any error even if partial data
   * exists, defaults to false.
   */
  +rejectAnyError?: boolean,
};

/**
 * The most common type of client.
 */
export type GraphQLClient = Client<RejectOptions>;

export type GraphQLError = {
  +message: string,
};

export type GraphQLErrorResponse = {
  +data: null,
  +errors: Array<GraphQLError>,
};

export type GraphQLRequestBody = {
  +query: string,
  +variables?: mixed,
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
 * Rejects any response without data, ie. they only contain errors.
 */
export const rejectErrorResponse = <R: {}>(res: GraphQLResponse<R>): GraphQLResult<R> => {
  if (!res.data) {
    throw queryError(res.errors);
  }

  return res;
};

/**
 * Rejects any response with errors, even if they contain data.
 */
export const rejectAnyErrorResponse = <R: {}>(res: GraphQLResponse<R>): GraphQLResult<R> => {
  if (res.errors) {
    throw queryError(res.errors);
  }

  return res;
};
