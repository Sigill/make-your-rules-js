import { CleanupRule, FilelistLike, getOrSet, isFunction, isString, join, splitLinesTrim, yieldFilelist } from "./utils.js";
import { Writable } from "./writable.js";

export interface RuleSpecs<T extends FilelistLike, P extends FilelistLike | undefined> {
  prerequisites?: P | (() => P);
  targets: T | ((p: P) => T);
  recipe?: string | ((targets: T) => string) | ((targets: T, prerequisites: P) => string);
  cleanup?: FilelistLike;
}

function writeRecipe(writable: Writable, recipe: string) {
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

function writeMakefileRule<T extends FilelistLike, P extends FilelistLike | undefined>(
  w: Writable,
  targets: T,
  prerequisites?: P,
  recipe?: string,
  separator: ':' | '::' | '&:' = ':')
{
  const prerequisitesList = [...yieldFilelist(prerequisites)];

  w.write(`${join([...yieldFilelist(targets)])} ${separator}`)
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
  constructor(
    protected readonly conf: {
      writable: Writable;
      defaultGoal: string;
      goals: Map<string, Array<string>>;
      autoclean: boolean;
      cleanRules: Map<string, CleanupRule>;

    },
    private readonly opts: {
      goal?: string;
      clean?: boolean | string;
    } = {})
  {}

  private addToGoal(name: string, targets: ReadonlyArray<string>) {
    getOrSet(this.conf.goals, name, () => []).push(...targets);
  }

  private addCleanRecipe(name: string, recipe: string) {
    getOrSet(this.conf.cleanRules, name, () => new CleanupRule(name)).recipes.push(recipe);
  }

  default(): RuleBuilder {
    return new RuleBuilder(this.conf, {...this.opts, goal: this.conf.defaultGoal});
  }

  goal(name: string): RuleBuilder {
    return new RuleBuilder(this.conf, {...this.opts, goal: name});
  }

  clean(name: boolean | string = true): RuleBuilder {
    return new RuleBuilder(this.conf, {...this.opts, clean: name});
  }

  rule<T extends FilelistLike, P extends FilelistLike | undefined>(opts: RuleSpecs<T, P> | (() => RuleSpecs<T, P>)): T {
    if (isFunction(opts)) {
      return this.rule(opts());
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const prerequisites = isFunction(opts.prerequisites) ? opts.prerequisites() : opts.prerequisites!;
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
  static create(w: Writable, opts: {autoclean?: boolean, default_goal?: string}, generator: (makefifle: Makefile) => void) {
    const ninja = new Makefile(w, opts);
    generator(ninja);
    ninja.finalize();
  }

  constructor(private readonly w: Writable, {autoclean, defaultGoal='all'}: {autoclean?: boolean, defaultGoal?: string} = {}) {
    super({
      writable: w,
      defaultGoal,
      goals: new Map<string, Array<string>>(),
      autoclean: autoclean ?? true,
      cleanRules: new Map<string, CleanupRule>(),
    });
  }

  cleanupRule(name: string) {
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
