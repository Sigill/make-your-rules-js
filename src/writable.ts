// Borrowed from https://github.com/zacharyvoase/ninja-builder/blob/75b8caecbba787f1d1a961b49225adfded12dfc8/src/util.ts

export interface Writable {
  write(s: string): boolean;
}

export class StringWritable implements Writable {
  private readonly chunks: string[] = [];

  write(s: string): boolean {
    this.chunks.push(s);
    return true;
  }

  toString(): string {
    return this.chunks.join('');
  }
}