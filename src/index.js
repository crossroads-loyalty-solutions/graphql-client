/* @flow */

export type { Client, GraphQLError, GraphQLResult, Query } from "./graphql";
export type { Fetch } from "./fetch";

export { createClient as createFetchClient } from "./fetch";
export { createClient as createBatchedClient } from "./batched";
export { createClient as createCachedClient } from "./cache";
