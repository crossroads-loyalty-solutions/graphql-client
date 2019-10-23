/* @flow */

export type Resolve<T> = (t: Promise<T> | T) => void;

export type Reject = (e: any) => void;

export type PromiseTracker = {
  add: (req: Promise<any>) => void,
  size: () => number,
  wait: () => Promise<void>,
};

export const resolved: Promise<void> =
  new Promise((resolve: Resolve<void>): void => resolve(undefined));

export const createPromiseTracker = (): PromiseTracker => {
  const inflight = [];
  let waiting = [];

  // TODO: How to manage errors?
  const done = (): void => {
    for (const i of waiting) {
      i();
    }

    waiting = [];
  };

  const add = (req: Promise<any>): void => {
    const drop = (): void => {
      const i = inflight.indexOf(req);

      if (i !== -1) {
        inflight.splice(i, 1);
      }

      if (inflight.length === 0) {
        done();
      }
    };

    inflight.push(req);
    // TODO: How to manage errors?
    req.then(drop, drop);
  };

  const size = (): number =>
    inflight.length;

  const wait = (): Promise<void> => {
    if (inflight.length > 0) {
      return new Promise((resolve: Resolve<void>): void => {
        waiting.push(resolve);
      });
    }

    return resolved;
  };

  return {
    wait,
    add,
    size,
  };
};
