// Borrowed from https://github.com/zacharyvoase/ninja-builder/blob/75b8caecbba787f1d1a961b49225adfded12dfc8/src/util.ts
export class StringWritable {
    constructor() {
        this.chunks = [];
    }
    write(s) {
        this.chunks.push(s);
        return true;
    }
    toString() {
        return this.chunks.join('');
    }
}
//# sourceMappingURL=writable.js.map