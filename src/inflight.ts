export type ExecuteOptions<T> = {
  queryKey: string;
  queryFunction: () => Promise<T>;
};

export class InFlightConflictError extends Error {
  readonly queryKey: string;
  constructor(queryKey: string) {
    super(`inflight conflict for "${queryKey}"`);
    this.name = "InFlightConflictError";
    this.queryKey = queryKey;
  }
}

export class InFlight {
  private inflight = new Map<string, Promise<unknown>>();

  async execute<T>({ queryKey, queryFunction }: ExecuteOptions<T>): Promise<T> {
    const existing = this.inflight.get(queryKey);
    if (existing) return existing as Promise<T>;

    const promise = queryFunction().finally(() => {
      this.inflight.delete(queryKey);
    });

    this.inflight.set(queryKey, promise);
    return promise;
  }

  executeOrReject<T>({ queryKey, queryFunction }: ExecuteOptions<T>): Promise<T> {
    if (this.inflight.has(queryKey)) {
      return Promise.reject(new InFlightConflictError(queryKey));
    }

    const promise = queryFunction().finally(() => {
      this.inflight.delete(queryKey);
    });

    this.inflight.set(queryKey, promise);
    return promise;
  }

  has(queryKey: string): boolean {
    return this.inflight.has(queryKey);
  }

  clearOne(queryKey: string): void {
    this.inflight.delete(queryKey);
  }

  clearAll(): void {
    this.inflight.clear();
  }

  get size(): number {
    return this.inflight.size;
  }
}

export default InFlight;
