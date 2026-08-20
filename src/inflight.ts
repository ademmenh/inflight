export type ExecuteOptions<T> = {
  queryKey: string;
  queryFunction: () => Promise<T>;
};

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

  has(queryKey: string): boolean {
    return this.inflight.has(queryKey);
  }

  clear(queryKey?: string): void {
    if (queryKey) {
      this.inflight.delete(queryKey);
    } else {
      this.inflight.clear();
    }
  }

  get size(): number {
    return this.inflight.size;
  }
}

export default InFlight;
