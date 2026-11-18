import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@acme/platform/audit";
import { groupMembers, groupRoles, users, type Db } from "@acme/platform/db";
import { maskPii, revealPii, type PiiKind } from "@acme/platform/pii";
import { assertCan, can, rowScope, type CurrentUser } from "@acme/platform/rbac";
import { WorkflowError } from "@acme/platform/workflow";
import { kycApp } from "../manifest";
import { kycCases, type KycCase } from "./schema";
import { applyCase, kycWorkflow, type KycTransition } from "./workflow";

const APP = kycApp.key;
const ENTITY = "kyc_case";
const HOUR = 3_600_000;
/** Open cases due within this window are flagged "due soon". */
export const DUE_SOON_HOURS = 24;

export const PII_FIELDS = {
  customerName: "name",
  dateOfBirth: "dob",
  nationalId: "ssn",
  address: "address",
  email: "email",
} as const satisfies Partial<Record<keyof KycCase, PiiKind>>;
export type PiiField = keyof typeof PII_FIELDS;
export const isPiiField = (f: string): f is PiiField => f in PII_FIELDS;

export type SlaState = "on_track" | "due_soon" | "breached" | "met" | "missed";
export interface SlaInfo {
  state: SlaState;
  /** Hours until due (negative once overdue). For closed cases: relative to the decision time. */
  hoursLeft: number;
}

/** What pages receive: PII replaced by server-masked strings, plus computed SLA. */
export type KycCaseView = Omit<KycCase, PiiField> & { masked: Record<PiiField, string>; sla: SlaInfo };

export function caseSla(c: Pick<KycCase, "status" | "slaDueAt" | "decidedAt">, now: number = Date.now()): SlaInfo {
  const due = Date.parse(c.slaDueAt);
  if (kycWorkflow.terminal.includes(c.status)) {
    const decided = c.decidedAt ? Date.parse(c.decidedAt) : now;
    const hoursLeft = Math.floor((due - decided) / HOUR);
    return { state: decided <= due ? "met" : "missed", hoursLeft };
  }
  const hoursLeft = Math.floor((due - now) / HOUR);
  return { state: due < now ? "breached" : hoursLeft < DUE_SOON_HOURS ? "due_soon" : "on_track", hoursLeft };
}

function toView(c: KycCase, now: number): KycCaseView {
  const { customerName, dateOfBirth, nationalId, address, email, ...rest } = c;
  return {
    ...rest,
    masked: {
      customerName: maskPii(customerName, "name"),
      dateOfBirth: maskPii(dateOfBirth, "dob"),
      nationalId: maskPii(nationalId, "ssn"),
      address: maskPii(address, "address"),
      email: maskPii(email, "email"),
    },
    sla: caseSla(c, now),
  };
}

/** Row-level security on the raw record: analysts only reach cases assigned to them. */
function loadCase(db: Db, user: CurrentUser, id: string): KycCase | null {
  assertCan(user, "kyc.view");
  const c = db.select().from(kycCases).where(eq(kycCases.id, id)).get();
  // Out-of-scope cases look missing (404), so ids can't be probed.
  if (!c || (c.assignedTo !== user.id && !can(user, "kyc.view_all"))) return null;
  return c;
}

/** Open cases first, oldest SLA first. */
export function listCases(db: Db, user: CurrentUser, now: number = Date.now()): KycCaseView[] {
  assertCan(user, "kyc.view");
  const rows = db.select().from(kycCases).where(rowScope(user, "kyc.view_all", kycCases.assignedTo)).orderBy(asc(kycCases.slaDueAt)).all();
  const open = (c: KycCase) => (kycWorkflow.terminal.includes(c.status) ? 1 : 0);
  return rows.sort((a, b) => open(a) - open(b)).map((c) => toView(c, now));
}

export function getCase(db: Db, user: CurrentUser, id: string, now: number = Date.now()): KycCaseView | null {
  const c = loadCase(db, user, id);
  return c ? toView(c, now) : null;
}

export function queueStats(rows: KycCaseView[]) {
  const open = rows.filter((r) => !kycWorkflow.terminal.includes(r.status));
  return {
    open: open.length,
    breached: open.filter((r) => r.sla.state === "breached").length,
    dueSoon: open.filter((r) => r.sla.state === "due_soon").length,
    escalated: open.filter((r) => r.status === "escalated").length,
    unassigned: open.filter((r) => !r.assignedTo).length,
    closed: rows.length - open.length,
  };
}

/** Approve / reject / escalate: workflow check, then state change + audit in one transaction. */
export function decideCase(db: Db, user: CurrentUser, id: string, transition: KycTransition, reason: string | null): KycCaseView {
  const current = loadCase(db, user, id);
  if (!current) throw new WorkflowError("Case not found");
  const to = applyCase(transition, current, user, reason);
  const at = new Date().toISOString();
  const changes = transition === "escalate" ? { status: to, escalatedBy: user.id, escalatedAt: at } : { status: to, decidedBy: user.id, decidedAt: at };
  return db.transaction((tx) => {
    const updated = tx
      .update(kycCases)
      .set(changes)
      .where(and(eq(kycCases.id, id), eq(kycCases.status, current.status)))
      .returning()
      .get();
    if (!updated) throw new WorkflowError("This case was changed by someone else. Reload and try again.");
    audit(tx, { actorId: user.id, app: APP, action: `case.${transition}`, entity: { type: ENTITY, id }, before: { status: current.status }, after: { status: to }, reason });
    return toView(updated, Date.parse(at));
  });
}

/** People who can work cases: members of groups mapped to a KYC role that grants `kyc.decide`. */
export function listAssignees(db: Db): { id: string; displayName: string }[] {
  const roleKeys = kycApp.roles.filter((r) => (r.permissions as readonly string[]).includes("kyc.decide")).map((r) => r.key);
  return db
    .selectDistinct({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(groupMembers, eq(groupMembers.userId, users.id))
    .innerJoin(groupRoles, eq(groupRoles.groupId, groupMembers.groupId))
    .where(and(eq(users.active, true), inArray(groupRoles.roleKey, roleKeys)))
    .orderBy(asc(users.displayName))
    .all();
}

export const assignCaseSchema = z.object({
  assigneeId: z.string().trim().min(1, "Pick an analyst"),
  reason: z.string().trim().max(500).optional(),
});

/** Leads assign open cases. Reassigning (taking a case off someone) needs a reason. */
export function assignCase(db: Db, user: CurrentUser, id: string, input: z.infer<typeof assignCaseSchema>): KycCaseView {
  assertCan(user, "kyc.assign");
  const current = loadCase(db, user, id);
  if (!current) throw new WorkflowError("Case not found");
  if (kycWorkflow.terminal.includes(current.status)) throw new WorkflowError("This case is closed.");
  if (current.assignedTo === input.assigneeId) throw new WorkflowError("The case is already assigned to that person.");
  if (!listAssignees(db).some((a) => a.id === input.assigneeId)) throw new WorkflowError("That person does not hold a KYC role.");
  const reason = input.reason?.trim() || null;
  if (current.assignedTo && !reason) throw new WorkflowError("A reason is required to reassign a case.");
  return db.transaction((tx) => {
    const updated = tx
      .update(kycCases)
      .set({ assignedTo: input.assigneeId })
      .where(and(eq(kycCases.id, id), eq(kycCases.status, current.status)))
      .returning()
      .get();
    if (!updated) throw new WorkflowError("This case was changed by someone else. Reload and try again.");
    audit(tx, {
      actorId: user.id,
      app: APP,
      action: current.assignedTo ? "case.reassign" : "case.assign",
      entity: { type: ENTITY, id },
      before: { assignedTo: current.assignedTo },
      after: { assignedTo: input.assigneeId },
      reason,
    });
    return toView(updated, Date.now());
  });
}

/** Break-glass reveal of one PII field: permission + row scope + reason, audited by `revealPii`. */
export function revealCaseField(db: Db, user: CurrentUser, id: string, field: string, reason: string): string {
  assertCan(user, "kyc.pii.reveal");
  if (!isPiiField(field)) throw new WorkflowError(`Unknown field ${field}`);
  const c = loadCase(db, user, id);
  if (!c) throw new WorkflowError("Case not found");
  return revealPii(db, { user, permission: "kyc.pii.reveal", app: APP, entity: { type: ENTITY, id }, field, value: c[field], reason });
}
