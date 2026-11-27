import { WorkerError } from '../lib/errors.ts';
import type { ValhallaRequestScope } from './valhalla.ts';

export class RoutingScope implements ValhallaRequestScope {
  readonly #signal: AbortSignal;
  readonly #protect: () => Promise<void>;
  readonly #inFlight = new Set<Promise<unknown>>();
  #protection?: Promise<void>;
  #closed = false;
  #confirmed = true;
  #protected = false;

  constructor(signal: AbortSignal, protect: () => Promise<void>) {
    this.#signal = signal;
    this.#protect = protect;
  }

  get guardRecorded(): boolean {
    return this.#protected;
  }

  run<T>(request: () => Promise<T>): Promise<T> {
    return this.#track(request, true);
  }

  runLocal<T>(request: () => Promise<T>): Promise<T> {
    return this.#track(request, false);
  }

  async #track<T>(request: () => Promise<T>, uncertainOnError: boolean): Promise<T> {
    this.#signal.throwIfAborted();
    if (this.#closed) throw new WorkerError('snapshot_routing_closed', 'Snapshot routing ended');
    this.#protection ??= this.#protect().then(() => {
      this.#protected = true;
    });
    const pending = this.#protection.then(async () => {
      this.#signal.throwIfAborted();
      if (this.#closed) throw new WorkerError('snapshot_routing_closed', 'Snapshot routing ended');
      try {
        return await request();
      } catch (error) {
        if (uncertainOnError) this.#confirmed = false;
        throw error;
      }
    });
    this.#inFlight.add(pending);
    try {
      return await pending;
    } finally {
      this.#inFlight.delete(pending);
    }
  }

  async drain(): Promise<void> {
    this.#closed = true;
    await Promise.allSettled(this.#inFlight);
    if (!this.#confirmed) {
      throw new WorkerError(
        'snapshot_routing_unconfirmed',
        'Cannot confirm that in-flight Valhalla requests ended',
      );
    }
  }
}
