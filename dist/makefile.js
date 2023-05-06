import { CleanupRule, getOrSet, isFunction, isString, join, splitLinesTrim, yieldFilelist } from "./utils.js";
function writeRecipe(writable, recipe) {
    const lines = splitLinesTrim(recipe);
    for (const [index, line] of lines.entries()) {
        writable.write('\t');
        writable.write(line);
        if (index < lines.length - 1) {
            writable.write(' \\');
        }
        writable.write('\n');
    }
}
function writeMakefileRule(w, targets, prerequisites, recipe, separator = ':') {
    const prerequisitesList = [...yieldFilelist(prerequisites)];
    w.write(`${join([...yieldFilelist(targets)])} ${separator}`);
    if (prerequisitesList.length > 0) {
        w.write(` ${join(prerequisitesList)}`);
    }
    w.write('\n');
    if (recipe !== undefined) {
        writeRecipe(w, recipe);
    }
    w.write('\n');
}
export class RuleBuilder {
    constructor(conf, opts = {}) {
        this.conf = conf;
        this.opts = opts;
    }
    addToGoal(name, targets) {
        getOrSet(this.conf.goals, name, () => [])?.push(...targets);
    }
    addCleanRecipe(name, recipe) {
        getOrSet(this.conf.cleanRules, name, () => new CleanupRule(name)).recipes.push(recipe);
    }
    default() {
        return new RuleBuilder(this.conf, { ...this.opts, goal: this.conf.defaultGoal });
    }
    goal(name) {
        return new RuleBuilder(this.conf, { ...this.opts, goal: name });
    }
    clean(name = true) {
        return new RuleBuilder(this.conf, { ...this.opts, clean: name });
    }
    rule(opts) {
        if (isFunction(opts)) {
            return this.rule(opts());
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const prerequisites = isFunction(opts.prerequisites) ? opts.prerequisites() : opts.prerequisites;
        const targets = isFunction(opts.targets) ? opts.targets(prerequisites) : opts.targets;
        const recipe = isFunction(opts.recipe) ? opts.recipe(targets, prerequisites) : opts.recipe;
        const filelist = [...yieldFilelist(targets)];
        if (this.opts.goal !== undefined) {
            this.addToGoal(this.opts.goal, filelist);
        }
        writeMakefileRule(this.conf.writable, filelist, prerequisites, recipe, '&:');
        if (opts.cleanup ?? this.opts.clean ?? this.conf.autoclean) {
            const clean_target = isString(this.opts.clean) ? this.opts.clean : 'clean';
            const files = opts.cleanup === undefined ? filelist : [...yieldFilelist(opts.cleanup)];
            this.addCleanRecipe(clean_target, `rm -rf ${join(files)}`);
        }
        return targets;
    }
}
export class Makefile extends RuleBuilder {
    static create(w, opts, generator) {
        const ninja = new Makefile(w, opts);
        generator(ninja);
        ninja.finalize();
    }
    constructor(w, { autoclean, defaultGoal = 'all' } = {}) {
        super({
            writable: w,
            defaultGoal,
            goals: new Map(),
            autoclean: autoclean ?? true,
            cleanRules: new Map(),
        });
        this.w = w;
    }
    cleanupRule(name) {
        return getOrSet(this.conf.cleanRules, name, () => new CleanupRule(name));
    }
    finalize() {
        for (const [target, rule] of this.conf.cleanRules.entries()) {
            this.conf.writable.write(`${target} :`);
            if (rule.dependencies.length !== 0) {
                this.w.write(` ${rule.dependencies.map(rule => rule.name).join(' ')}`);
            }
            this.conf.writable.write(`\n\t${rule.recipes.join('\n\t')}`);
            this.w.write('\n\n');
        }
        for (const [goal, targets] of this.conf.goals.entries()) {
            this.w.write(`${goal} : ${join(targets)}\n\n`);
        }
        this.w.write(`.PHONY : ${[...this.conf.cleanRules.keys(), ...this.conf.goals.keys()].join(' ')}\n\n`);
        this.w.write(`.DEFAULT_GOAL ::= ${join(this.conf.defaultGoal)}\n\n`);
    }
}
//# sourceMappingURL=makefile.js.map