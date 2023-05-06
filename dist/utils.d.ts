declare global {
    interface ArrayConstructor {
        isArray(arg: ReadonlyArray<any> | any): arg is ReadonlyArray<any>;
    }
    interface Array<T> {
        findLastIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
    }
}
export declare function isString(t: any): t is string;
export declare function isFunction(val: any): val is (...args: any[]) => any;
export declare function getOrSet<K, V>(map: Map<K, V>, key: K, initializer: () => V): V;
export declare class CleanupRule {
    readonly name: string;
    readonly recipes: string[];
    readonly dependencies: CleanupRule[];
    constructor(name: string);
    needs(...targets: ReadonlyArray<CleanupRule>): this;
}
export type FilelistLike = string | ReadonlyArray<FilelistLike> | {
    [P in keyof any]: FilelistLike;
};
export declare function yieldFilelist(files?: FilelistLike): Generator<string>;
export declare function getFilelist(files?: FilelistLike): Array<string>;
export declare function splitLinesTrim(txt: string): Array<string>;
export declare function join<T extends {
    filelist: ReadonlyArray<string>;
} | ReadonlyArray<string> | string>(t: T): string;
export declare function mapp<K extends string | number, V>(t: ReadonlyArray<K>, transform: (k: K) => V): {
    [P in K]: V;
};
