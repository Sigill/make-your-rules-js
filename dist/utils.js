export function isString(t) {
    return typeof t === 'string';
}
export function isFunction(val) {
    return typeof val === 'function';
}
export function getOrSet(map, key, initializer) {
    if (map.has(key)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return map.get(key);
    }
    const value = initializer();
    map.set(key, value);
    return value;
}
export class CleanupRule {
    constructor(name) {
        this.name = name;
        this.recipes = new Array();
        this.dependencies = new Array();
    }
    needs(...targets) {
        this.dependencies.push(...targets);
        return this;
    }
}
export function* yieldFilelist(files) {
    if (isString(files)) {
        yield files;
    }
    else if (Array.isArray(files)) {
        for (const value of files) {
            yield* yieldFilelist(value);
        }
    }
    else if (files !== undefined) {
        for (const value of Object.values(files)) {
            yield* yieldFilelist(value);
        }
    }
}
export function getFilelist(files) {
    return [...yieldFilelist(files)];
}
function isNonBlank(str) {
    return str.trim().length !== 0;
}
export function splitLinesTrim(txt) {
    const lines = txt.split('\n');
    const first = lines.findIndex(isNonBlank);
    if (first === -1)
        return [];
    const last = lines.findLastIndex(isNonBlank);
    return lines.slice(first, last + 1);
}
export function join(t) {
    if (isString(t)) {
        return t;
    }
    else if (Array.isArray(t)) {
        return t.join(' ');
    }
    else {
        return t.filelist.join(' ');
    }
}
export function mapp(t, transform) {
    return t.reduce((record, subunit) => { record[subunit] = transform(subunit); return record; }, {});
}
//# sourceMappingURL=utils.js.map