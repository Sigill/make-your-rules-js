import { CleanupRule, FilelistLike, getOrSet, isFunction, isString, join, splitLinesTrim, yieldFilelist } from "./utils.js";
import { Writable } from "./writable.js";

export interface RuleSpecs<T extends FilelistLike, P extends FilelistLike | undefined> {
  prerequisites?: P | (() => P);
  targets: T | ((p: P) => T);
  recipe?: string | ((targets: T) => string) | ((targets: T, prerequisites: P) => string);
  cleanup?: FilelistLike;
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

  clean(name: boolean | string | CleanupRule = true): RuleBuilder {
    return new RuleBuilder(this.conf, {...this.opts, clean: name instanceof CleanupRule ? name.name : name});
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

    writeNinjaRule(this.conf.writable, filelist, prerequisites, recipe);

    if (opts.cleanup ?? this.opts.clean ?? this.conf.autoclean) {
      const clean_target = isString(this.opts.clean) ? this.opts.clean : 'clean';
      const files = opts.cleanup === undefined ? filelist : [...yieldFilelist(opts.cleanup)];
      this.addCleanRecipe(clean_target, `rm -rf ${join(files)}`);
    }

    return targets;
  }
}

function writeRecipe(writable: Writable, recipe: string) {
  writable.write(`  COMMAND = `);
  writable.write(splitLinesTrim(recipe).join(' $\n'));
  writable.write('\n');
}

export function writeNinjaRule<T extends FilelistLike, P extends FilelistLike | undefined>(
  w: Writable,
  targets: T,
  prerequisites?: P,
  recipe?: string)
{
  const prerequisitesList = [...yieldFilelist(prerequisites)];

  w.write(`build ${join([...yieldFilelist(targets)])}: RUN`)
  if (prerequisitesList.length > 0) {
    w.write(` ${join(prerequisitesList)}`);
  }
  w.write('\n');
  if (recipe !== undefined) {
    writeRecipe(w, recipe);
  }
  w.write('\n');
}

export class Ninja extends RuleBuilder {
  static create(w: Writable, opts: {autoclean?: boolean, default_goal?: string}, generator: (ninja: Ninja) => void) {
    const ninja = new Ninja(w, opts);
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

    this.w.write(`rule RUN\n  command = $COMMAND\n\n`);
  }

  cleanupRule(name: string) {
    return getOrSet(this.conf.cleanRules, name, () => new CleanupRule(name));
  }

  finalize() {
    for (const [target, rule] of this.conf.cleanRules.entries()) {
      this.w.write(`build ${target}: RUN`);
      if (rule.dependencies.length !== 0) {
        this.w.write(` | ${rule.dependencies.map(rule => rule.name).join(' ')}`);
      }
      this.w.write('\n');
      this.w.write(`  COMMAND = `);
      this.w.write(rule.recipes.join(' ; $\n'));
      this.w.write('\n\n');
    }

    for (const [goal, targets] of this.conf.goals.entries()) {
      this.w.write(`build ${goal}: phony | ${join(targets)}\n\n`);
    }

    this.w.write(`default ${this.conf.defaultGoal}\n\n`);
  }

}
