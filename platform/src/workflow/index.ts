import { can, type CurrentUser } from "../rbac";
import type { Permission } from "../registry";

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export interface WorkflowEntity<S extends string> {
  status: S;
  /** The maker. Used to enforce four-eyes on `makerChecker` transitions. */
  createdBy: string;
}

export interface TransitionDef<S extends string, E> {
  label: string;
  from: readonly S[];
  to: S;
  /** Static permission, or computed from the entity (e.g. approval limits by amount). */
  permission: Permission | ((entity: E) => Permission);
  /** Four-eyes principle: the maker may never perform this transition on their own record. */
  makerChecker?: boolean;
  requireReason?: boolean;
}

export interface WorkflowDef<S extends string, E extends WorkflowEntity<S>, T extends string> {
  name: string;
  states: readonly S[];
  initial: S;
  terminal: readonly S[];
  transitions: Record<T, TransitionDef<S, E>>;
}

export interface Workflow<S extends string, E extends WorkflowEntity<S>, T extends string> extends WorkflowDef<S, E, T> {
  requiredPermission(transition: T, entity: E): Permission;
  /** Why `user` can't perform `transition` on `entity`, or null if allowed. */
  check(transition: T, entity: E, user: CurrentUser, reason?: string | null): string | null;
  /** Returns the next state or throws `WorkflowError`. Caller persists + audits. */
  apply(transition: T, entity: E, user: CurrentUser, reason?: string | null): S;
  /** Transitions the user may perform now — drives which action buttons the UI renders. */
  available(entity: E, user: CurrentUser): T[];
}

/** Power Automate-style approval flow as a typed, testable state machine. */
export function defineWorkflow<S extends string, E extends WorkflowEntity<S>, T extends string>(
  def: WorkflowDef<S, E, T>,
): Workflow<S, E, T> {
  const requiredPermission = (t: T, e: E) => {
    const p = def.transitions[t].permission;
    return typeof p === "function" ? p(e) : p;
  };
  const check = (t: T, e: E, user: CurrentUser, reason?: string | null): string | null => {
    const tr = def.transitions[t];
    if (!tr) return `Unknown transition "${t}"`;
    if (!tr.from.includes(e.status)) return `Cannot ${tr.label.toLowerCase()} a ${e.status} item`;
    const perm = requiredPermission(t, e);
    if (!can(user, perm)) return `Requires permission "${perm}"`;
    if (tr.makerChecker && e.createdBy === user.id) return "Maker-checker: you cannot approve your own request";
    if (tr.requireReason && !reason?.trim()) return "A reason is required";
    return null;
  };
  return {
    ...def,
    requiredPermission,
    check,
    apply(t, e, user, reason) {
      const err = check(t, e, user, reason);
      if (err) throw new WorkflowError(err);
      return def.transitions[t].to;
    },
    available(e, user) {
      return (Object.keys(def.transitions) as T[]).filter((t) => {
        const tr = def.transitions[t];
        return tr.from.includes(e.status) && !check(t, e, user, "x");
      });
    },
  };
}

export interface ApprovalTier {
  /** Inclusive upper bound in minor units; omit for the top tier. */
  maxMinor?: number;
  permission: Permission;
  label: string;
}

/** Picks the approval tier for an amount, e.g. <= $500 team lead, <= $5,000 manager, above: finance. */
export function approvalTier(tiers: readonly ApprovalTier[], amountMinor: number): ApprovalTier {
  const tier = tiers.find((t) => t.maxMinor === undefined || amountMinor <= t.maxMinor);
  if (!tier) throw new WorkflowError(`No approval tier covers amount ${amountMinor}`);
  return tier;
}
