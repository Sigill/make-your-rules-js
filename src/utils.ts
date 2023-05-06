declare global {
  // https://github.com/microsoft/TypeScript/issues/17002#issuecomment-313719111
  interface ArrayConstructor {
    isArray(arg: ReadonlyArray<any> | any): arg is ReadonlyArray<any>
  }

  // https://github.com/microsoft/TypeScript/issues/49453#issuecomment-1295494555
  interface Array<T> {
    findLastIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number
  }
}

export function isString(t: any): t is string {
  return typeof t === 'string';
}

export function isFunction(val: any): val is (...args: any[]) => any {
  return typeof val === 'function';
}

export function getOrSet<K, V>(map: Map<K, V>, key: K, initializer: () => V): V {
  if (map.has(key)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return map.get(key)!;
  }
  const value = initializer();
  map.set(key, value);
  return value;
}

export class CleanupRule {
  readonly recipes = new Array<string>();
  readonly dependencies = new Array<CleanupRule>();

  constructor(readonly name: string) {}

  needs(...targets: ReadonlyArray<CleanupRule>) {
    this.dependencies.push(...targets);
    return this;
  }
}

export type FilelistLike = string | ReadonlyArray<FilelistLike> | {[P in keyof any]: FilelistLike};

export function *yieldFilelist(files?: FilelistLike): Generator<string> {
  if (isString(files)) {
    yield files;
  } else if (Array.isArray(files)) {
    for (const value of files) {
      yield* yieldFilelist(value);
    }
  } else if (files !== undefined) {
    for (const value of Object.values(files)) {
      yield* yieldFilelist(value);
    }
  }
}

export function getFilelist(files?: FilelistLike): Array<string> {
  return [...yieldFilelist(files)];
}

function isNonBlank(str: string) {
  return str.trim().length !== 0
}

export function splitLinesTrim(txt: string): Array<string> {
  const lines = txt.split('\n');
  const first = lines.findIndex(isNonBlank);
  if (first === -1) return [];
  const last = lines.findLastIndex(isNonBlank);
  return lines.slice(first, last+1);
}

export function join<T extends {filelist: ReadonlyArray<string>} | ReadonlyArray<string> | string>(t: T): string {
  if (isString(t)) {
    return t;
  } else if (Array.isArray(t)) {
    return t.join(' ');
  } else {
    return t.filelist.join(' ');
  }
}

export function mapp<K extends string | number, V>(t: ReadonlyArray<K>, transform: (k: K) => V): {[P in K]: V} {
  return t.reduce((record, subunit) => { record[subunit] = transform(subunit); return record; }, {} as {[P in K]: V});
}
