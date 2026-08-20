export type ExecuteOptions<T> = {
    queryKey: string;
    queryFunction: () => Promise<T>;
};

export declare class InFlight {
    execute<T>(options: ExecuteOptions<T>): Promise<T>;

    has(queryKey: string): boolean;

    clear(queryKey?: string): void;

    get size(): number;
}

export default InFlight;
