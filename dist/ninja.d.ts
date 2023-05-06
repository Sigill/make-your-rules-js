import { CleanupRule, FilelistLike } from "./utils.js";
import { Writable } from "./writable.js";
export interface RuleSpecs<T extends FilelistLike, P extends FilelistLike | undefined> {
    prerequisites?: P | (() => P);
    targets: T | ((p: P) => T);
    recipe?: string | ((targets: T) => string) | ((targets: T, prerequisites: P) => string);
    cleanup?: FilelistLike;
}
export declare class RuleBuilder {
    protected readonly conf: {
        writable: Writable;
        defaultGoal: string;
        goals: Map<string, Array<string>>;
        autoclean: boolean;
        cleanRules: Map<string, CleanupRule>;
    };
    private readonly opts;
    constructor(conf: {
        writable: Writable;
        defaultGoal: string;
        goals: Map<string, Array<string>>;
        autoclean: boolean;
        cleanRules: Map<string, CleanupRule>;
    }, opts?: {
        goal?: string;
        clean?: boolean | string;
    });
    private addToGoal;
    private addCleanRecipe;
    default(): RuleBuilder;
    goal(name: string): RuleBuilder;
    clean(name?: boolean | string | CleanupRule): RuleBuilder;
    rule<T extends FilelistLike, P extends FilelistLike | undefined>(opts: RuleSpecs<T, P> | (() => RuleSpecs<T, P>)): T;
}
export declare function writeNinjaRule<T extends FilelistLike, P extends FilelistLike | undefined>(w: Writable, targets: T, prerequisites?: P, recipe?: string): void;
export declare class Ninja extends RuleBuilder {
    private readonly w;
    static create(w: Writable, opts: {
        autoclean?: boolean;
        default_goal?: string;
    }, generator: (ninja: Ninja) => void): void;
    constructor(w: Writable, { autoclean, defaultGoal }?: {
        autoclean?: boolean;
        defaultGoal?: string;
    });
    cleanupRule(name: string): CleanupRule;
    finalize(): void;
}
