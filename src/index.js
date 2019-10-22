/* @flow */

export type {
  Fetch,
  GraphQLResult,
  GraphQLError,
} from "./types";

export { createClient as createFetchClient } from "./fetch";
export { createClient as createBatchedClient } from "./batched";
export { createCachedClient } from "./cache";

/*
export class GraphQLClient {
  fetch: Fetch;
  endpoint: string;
  debounce: number;
  queue: Promise<void>;
  timer: ?TimeoutID;
  pending: Array<Pending<any, any>> = [];
  inflights: number = 0;
  waiting: Array<{ resolve: () => void, reject: (error: any) => void }> = [];

  constructor(fetch: Fetch, options: Options) {
    const { endpoint, debounce = 5 } = options;

    this.endpoint = endpoint;
    this.debounce = debounce;
    this.fetch = fetch;
    this.queue = new Promise(resolve => resolve(undefined));
  }

  // TODO: Support for immediate queue
  query<P, R: {}>(query: Query<P, R>, variables: P): Promise<GraphQLResponse<R>> {
    return new Promise((resolve, reject) => this.enqueue({ query, variables, resolve, reject }));
  }

  enqueue<P, R>(pending: Pending<P, R>): void {
    this.pending.push(pending);

    // TODO: Queue on promise instead, but have a timer to debounce
    // TODO: Use a debounce or throttle?
    if (!this.timer) {
      this.timer = setTimeout(() => this.fire(), this.debounce);
    }
  }

  fire(): void {
    // Do not yet clear the timeout, wait for the request to complete before
    // doing it

    this.inflights += 1;
    this.queue = this.queue
      .then(() => this.runRequests())
      .then(() => this.onRequestsFinished());
  }

  runRequests(): Promise<void> {
    const { endpoint, fetch, pending } = this;
    const init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pending.map(({ query, variables }) => ({ query, variables }))),
    };

    const onResponse = (response: Array<MaybeGraphQLResponse<any>>) => {
      response.forEach((r, i) => {
        if (r.errors) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Got GraphQL error:", r.errors);
          }

          if (!r.data) {
            pending[i].reject(r.errors);

            const error: DError = new Error("GraphQL Request Error");

            error.httpBody = JSON.stringify(r.errors, null, 2);

            while (this.waiting.length > 0) {
              this.waiting.pop().reject(error);
            }

            return;
          }
        }

        pending[i].resolve(r);
      });
    };

    const onError = error => {
      // TODO: Check if it is a http body
      pending.forEach(({ reject }) => reject(error));

      while (this.waiting.length > 0) {
        this.waiting.pop().reject(error);
      }
    };

    clearTimeout(this.timer);
    this.timer = null;
    this.pending = [];

    // console.log(`Sending ${pending.length} queries`);

    return fetch(endpoint, init).then(jsonResponse).then(onResponse, onError);
  }

  onRequestsFinished(): void {
    this.inflights -= 1;

    if (this.inflights > 0 || this.pending.length > 0) {
      // We are still waiting on requests to process
      return;
    }

    while (this.waiting.length > 0) {
      this.waiting.pop().resolve();
    }
  }

  waitForRequests(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.hasPromisesRemaining()) {
        this.waiting.push({ resolve, reject });
      }
      else {
        resolve();
      }
    });
  }

  hasPromisesRemaining(): boolean {
    return this.inflights + this.pending.length > 0;
  }
}
*/
