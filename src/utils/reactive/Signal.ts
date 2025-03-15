const Signal = { currentSubscriber: null };

function createSignal<T>(initialValue: T) {
  let value = initialValue;
  const subscribers = new Set<(value: T) => void>();

  const notifySubscribers = () => {
    for (const subscriber of subscribers) {
      subscriber(value);
    }
  };

  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "value") {
          if (Signal.currentSubscriber) {
            subscribers.add(Signal.currentSubscriber);
          }
          return value;
        }
        if (prop === "subscribe") {
          return (callback: (value: T) => void) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
          };
        }
        if (prop === "set") {
          return (newValue: T) => {
            if (value !== newValue) {
              value = newValue;
              notifySubscribers();
            }
          };
        }
        return undefined;
      },
    },
  );
}

function effect(callback) {
  Signal.currentSubscriber = callback;
  callback();
  Signal.currentSubscriber = null;
}

function createMemo(computeFn) {
  let value;
  const dependencies = new Set();
  const subscribers = new Set();

  const memo = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "value") {
          if (Signal.currentSubscriber) {
            subscribers.add(Signal.currentSubscriber);
          }
          return value;
        }
        if (prop === "subscribe") {
          return (callback) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
          };
        }
        return undefined;
      },
    },
  );

  const recompute = () => {
    Signal.currentSubscriber = () => {
      dependencies.forEach((dep) => dep.unsubscribe());
      dependencies.clear();
    };

    const newValue = computeFn();

    if (newValue !== value) {
      value = newValue;
      for (const subscriber of subscribers) {
        subscriber(value);
      }
    }

    Signal.currentSubscriber = null;
  };

  recompute();
  return memo;
}

function createDeepSignal<T extends object>(initialValue: T) {
  const subscribers = new Set<(value: T) => void>();

  const notifySubscribers = (value: T) => {
    for (const subscriber of subscribers) {
      subscriber(value);
    }
  };

  const wrap = (value: T) => {
    if (typeof value !== "object" || value === null) {
      return value;
    }

    return new Proxy(value, {
      get(target, prop) {
        if (Signal.currentSubscriber) {
          subscribers.add(Signal.currentSubscriber);
        }
        const result = target[prop];
        return wrap(result);
      },
      set(target, prop, newValue) {
        if (target[prop] !== newValue) {
          target[prop] = newValue;
          notifySubscribers(newValue);
        }
        return true;
      },
    });
  };

  const signal = wrap(initialValue);

  signal.subscribe = (callback) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  return signal;
}
