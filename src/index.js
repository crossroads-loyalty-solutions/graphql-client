/* @flow */

/**
 * Query type with parameters and return type as phantom types.
 */
// eslint-disable-next-line no-unused-vars
export type Query<P, R> = string;

type DError = Error & {
  httpBody?: string | {},
};

type QueryBody = {
  query: string,
  variables: { [key: string]: mixed },
};

/**
 * A GraphQL error.
 */
export type GraphQLError = {
  message: string,
};

export type GraphQLResponse<T> = {
  errors?: Array<GraphQLError>,
  data?: T,
};

export type Fetch = (input: string | Request, init?: RequestOptions) => Promise<Response>;

export type Options = {
  endpoint: string,
  debounce?: number,
};

type Pending<P, R> = {
  query: Query<P, R>,
  variables: P,
  resolve: (t: GraphQLResponse<R>) => void,
  reject: (e: any) => void,
};

const jsonResponse = <T>(resp: Response): Promise<T> =>
  resp.json();

const extractQuery = ({ query, variables }: Pending<any, any>): QueryBody =>
  ({ query, variables });

export class GraphQLClient {
  fetch: Fetch;
  endpoint: string;
  debounce: number;
  queue: Promise<void>;
  timer: ?TimeoutID;
  pending: Array<Pending<any, any>> = [];
  inflights: number = 0;
  waiting: Array<{ resolve: () => void, reject: (error: any) => void }> = [];

  constructor(fetch: Fetch, options: Options): void {
    const { endpoint, debounce = 5 } = options;

    this.endpoint = endpoint;
    this.debounce = debounce;
    this.fetch = fetch;
    this.queue = new Promise((resolve: (val: void) => void): void => resolve(undefined));
  }

  // TODO: Support for immediate queue
  query<P, R>(query: Query<P, R>, variables: P): Promise<GraphQLResponse<R>> {
    return new Promise((
      resolve: (response: GraphQLResponse<R>) => void,
      reject: (error: GraphQLError) => void
    ): void => this.enqueue({ query, variables, resolve, reject }));
  }

  enqueue<P, R>(pending: Pending<P, R>): void {
    this.pending.push(pending);

    // TODO: Queue on promise instead, but have a timer to debounce
    // TODO: Use a debounce or throttle?
    if (!this.timer) {
      this.timer = setTimeout((): void => this.fire(), this.debounce);
    }
  }

  fire(): void {
    // Do not yet clear the timeout, wait for the request to complete before
    // doing it

    this.inflights += 1;
    this.queue = this.queue
      .then(this.runRequests.bind(this))
      .then(this.onRequestsFinished.bind(this));
  }

  runRequests(): Promise<void> {
    const { endpoint, fetch, pending } = this;
    const init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pending.map(extractQuery)),
    };

    const onResponse = (response: Array<GraphQLResponse<any>>): void => {
      response.forEach((r: GraphQLResponse<any>, i: number): void => {
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

    const onError = (error: Error): void => {
      // TODO: Check if it is a http body
      pending.forEach(({ reject }: Pending<any, any>): void => reject(error));

      while (this.waiting.length > 0) {
        this.waiting.pop().reject(error);
      }
    };

    clearTimeout(this.timer);
    this.timer = null;
    this.pending = [];

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
    return new Promise((resolve: () => void, reject: (err: Error) => void): void => {
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
