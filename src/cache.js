/* @flow */

import type {
  Client,
  GraphQLClient,
  GraphQLRequestBody,
  GraphQLResult,
  Query,
  TypeofClientOptions,
} from "./graphql";

import deepEqual from "fast-deep-equal";

export type Cache<K, V> = {
  get: (k: K) => ?V,
  set: (k: K, v: V) => void,
  dropKey: (k: K) => void,
  dropValue: (v: V) => void,
};

export type CachedOptions<O> = O & {
  /**
   * If to use a cache for the query, defaults to false.
   */
  +cache?: boolean,
};

export type CachedClient<C: Client<any>> = Client<CachedOptions<TypeofClientOptions<C>>>;

export type CachedGraphQLClient = CachedClient<GraphQLClient>;

type CachedClientOptions = {
  size?: number,
};

/**
 * Creates a simple cache.
 */
export const createCache = <K, V>(size: number): Cache<K, V> => {
  // Use array since we have to compare keys using deep-equal
  // Last element is the most recently used
  const cache: Array<[K, V]> = [];

  const get = (k: K): ?V => {
    for (let i = 0; i < cache.length; i++) {
      if (deepEqual(cache[i][0], k)) {
        if (i + 1 === cache.length) {
          // Refresh
          const tmp = cache[cache.length - 1];

          cache[cache.length - 1] = cache[i];
          cache[i] = tmp;
        }

        return cache[i][1];
      }
    }
  };

  const dropKey = (k: K): void => {
    for (let i = 0; i < cache.length; i++) {
      if (deepEqual(cache[i][0], k)) {
        cache.splice(i, 1);

        return;
      }
    }
  };

  const dropValue = (v: V): void => {
    for (let i = 0; i < cache.length; i++) {
      if (cache[i][1] === v) {
        cache.splice(i, 1);
      }
    }
  };

  const set = (k: K, v: V): void => {
    for (let i = 0; i < cache.length; i++) {
      if (deepEqual(cache[i][0], k)) {
        cache.splice(i, 1);

        break;
      }
    }

    cache.push([k, v]);

    if (cache.length > size) {
      // Drop first
      cache.splice(0, 1);
    }
  };

  return {
    get,
    set,
    dropKey,
    dropValue,
  };
};

/**
 * Creates an opt-in LRU-cache for all queries.
 */
export const createClient = <C: Client<any>>(
  client: C,
  { size: cacheSize = 10 }: CachedClientOptions = {}
): CachedClient<C> => {
  const { query: parentQuery, wait, size } = (client: Client<TypeofClientOptions<C>>);
  const { dropValue, get, set } =
    createCache<GraphQLRequestBody, Promise<GraphQLResult<any>>>(cacheSize);

  const query = <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    options?: CachedOptions<TypeofClientOptions<C>>
  ): Promise<GraphQLResult<R>> => {
    if (!options || !options.cache) {
      return parentQuery(query, variables, options);
    }

    const key = { query, variables: variables || undefined };
    const req = get(key);

    if (req) {
      return req;
    }

    const newReq = parentQuery(query, variables, options);

    set(key, newReq);

    // In case it fails hard we want to remove it from the cache
    newReq.catch((): void => dropValue(newReq));

    return newReq;
  };

  return {
    query,
    wait,
    size,
  };
};
