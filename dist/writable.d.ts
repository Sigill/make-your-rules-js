export interface Writable {
    write(s: string): boolean;
}
export declare class StringWritable implements Writable {
    private readonly chunks;
    write(s: string): boolean;
    toString(): string;
}
