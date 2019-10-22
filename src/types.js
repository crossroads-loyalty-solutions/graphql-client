/* @flow */

export type Client<O> = {
  size: () => number,
  query: <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    options?: O
  ) => Promise<GraphQLResult<R>>,
  wait: () => Promise<void>,
};

export type Fetch = (input: string, init: RequestOptions) => Promise<Response>;

export type GraphQLError = {
  +message: string,
};

export type GraphQLErrorResponse = {
  +data: null,
  +errors: Array<GraphQLError>,
};

export type GraphQLRequestBody = {
  query: string,
  variables: ?mixed,
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

export type Resolve<T> = (t: T) => void;

export type Reject = (e: any) => void;
