/* @flow */

import type { Client, GraphQLRequestBody, GraphQLResult, Query } from "./graphql";

export type Cache<K, V> = {
  get: (k: K) => ?V,
  set: (k: K, v: V) => void,
  dropKey: (k: K) => void,
  dropValue: (v: V) => void,
};

type CachedClientOptions = {
  size?: number,
};

/**
 * Creates a simple cache.
 */
export const createCache = <K, V>(size: number): Cache<K, V> => {
  // Use a map since it accepts all types of values as keys
  const cache = new Map<K, V>();

  const get = (k: K): ?V => {
    const v = cache.get(k);

    if (v) {
      // Refresh
      cache.delete(k);
      cache.set(k, v);
    }

    return v;
  };

  const dropKey = (k: K): void => {
    cache.delete(k);
  };

  const dropValue = (v: V): void => {
    const entries = cache.entries();

    for (;;) {
      const e = entries.next();

      if (e.done) {
        return;
      }

      if (e.value[1] === v) {
        cache.delete(e.value[0]);

        return;
      }
    }
  };

  const set = (k: K, v: V): void => {
    if (!cache.delete(k)) {
      // No item was deleted, make space for the new one if necessary
      if (cache.size >= size) {
        const lastK = cache.keys().next().value;

        if (lastK) {
          cache.delete(lastK);
        }
      }
    }

    cache.set(k, v);
  };

  return {
    get,
    set,
    dropKey,
    dropValue,
  };
};

export const createCachedClient = <O: {}>(
  client: Client<O>,
  { size: cacheSize = 10 }: CachedClientOptions
): Client<O & { cache?: boolean }> => {
  const { query: parentQuery, wait, size } = client;
  const { dropValue, get, set } =
    createCache<GraphQLRequestBody, Promise<GraphQLResult<any>>>(cacheSize);

  const query = <P, R: {}>(
    query: Query<P, R>,
    variables: P,
    options?: O & { cache?: boolean }
  ): Promise<GraphQLResult<R>> => {
    const req = get({ query, variables });

    if (req) {
      return req;
    }

    const newReq = parentQuery(query, variables, options);

    set({ query, variables }, newReq);

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
