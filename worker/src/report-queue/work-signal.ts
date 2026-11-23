export type WorkSignal = {
  notify: () => void;
  wait: (timeoutMs: number, stop: AbortSignal) => Promise<void>;
};

export function createWorkSignal(): WorkSignal {
  let hasPendingWork = false;
  let wake: (() => void) | null = null;
  return {
    notify() {
      if (wake) wake();
      else hasPendingWork = true;
    },
    wait(timeoutMs, stop) {
      if (hasPendingWork || stop.aborted) {
        hasPendingWork = false;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          stop.removeEventListener('abort', done);
          wake = null;
          resolve();
        };
        const timer = setTimeout(done, timeoutMs);
        stop.addEventListener('abort', done, { once: true });
        wake = done;
      });
    },
  };
}
