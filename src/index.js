/* @flow */

export type {
  Client,
  GraphQLClient,
  GraphQLError,
  GraphQLResult,
  Query,
  TypeofClientOptions,
} from "./graphql";
export type { Fetch } from "./fetch";
export type { CachedGraphQLClient } from "./cache";

export { createClient as createFetchClient } from "./fetch";
export { createClient as createBatchedClient } from "./batched";
export { createClient as createCachedClient } from "./cache";
