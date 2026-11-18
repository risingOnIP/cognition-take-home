import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@acme/platform/audit";
import { groupMembers, groupRoles, users, type Db } from "@acme/platform/db";
import { maskPii, revealPii } from "@acme/platform/pii";
import { assertCan, can, rowScope, type CurrentUser } from "@acme/platform/rbac";
import { WorkflowError } from "@acme/platform/workflow";
import { kycApp } from "../manifest";
import { kycCases, type KycCase } from "./schema";
import { applyKyc, kycWorkflow, type KycTransition } from "./workflow";

const APP = kycApp.key;
const ENTITY = "kyc_case";
export const SYSTEM_ACTOR = "system:onboarding";

export const PII_FIELDS = ["dateOfBirth", "nationalId", "address", "email"] as const;
export type PiiField = (typeof PII_FIELDS)[number];

export const reassignSchema = z.object({
  assignedTo: z.string().trim().min(1, "Pick an analyst"),
  reason: z.string().trim().max(500).optional(),
});

/** Row-level security: analysts see cases assigned to them; leads and auditors see all. */
export function listCases(db: Db, user: CurrentUser): KycCase[] {
  assertCan(user, "kyc.view");
  return db.select().from(kycCases).where(rowScope(user, "kyc.view_all", kycCases.assignedTo)).orderBy(asc(kycCases.slaDueAt)).all();
}

export function getCase(db: Db, user: CurrentUser, id: string): KycCase | null {
  assertCan(user, "kyc.view");
  const c = db.select().from(kycCases).where(eq(kycCases.id, id)).get();
  // Out-of-scope cases are hidden (404), not forbidden, so ids can't be probed.
  if (!c || (c.assignedTo !== user.id && !can(user, "kyc.view_all"))) return null;
  return c;
}

/** Server-side masking: only these strings may reach the browser unless a reveal is audited. */
export function maskCase(c: KycCase): Record<PiiField, string> {
  return {
    dateOfBirth: maskPii(c.dateOfBirth, "dob"),
    nationalId: maskPii(c.nationalId, c.nationalIdType === "ssn" ? "ssn" : "account"),
    address: maskPii(c.address, "address"),
    email: maskPii(c.email, "email"),
  };
}

export function revealCaseField(db: Db, user: CurrentUser, id: string, field: PiiField, reason: string): string {
  assertCan(user, "kyc.pii.reveal");
  if (!PII_FIELDS.includes(field)) throw new Error(`Unknown field ${field}`);
  const c = getCase(db, user, id);
  if (!c) throw new WorkflowError("Case not found");
  return revealPii(db, { user, permission: "kyc.pii.reveal", app: APP, entity: { type: ENTITY, id }, field, value: c[field], reason });
}

export function transitionCase(db: Db, user: CurrentUser, id: string, transition: KycTransition, reason: string | null): KycCase {
  const current = getCase(db, user, id);
  if (!current) throw new WorkflowError("Case not found");
  const to = applyKyc(transition, current, user, reason);
  const now = new Date().toISOString();
  const changes: Partial<KycCase> = { status: to };
  if (transition === "submit_for_signoff") Object.assign(changes, { submittedBy: user.id, submittedAt: now });
  if (transition === "escalate") Object.assign(changes, { escalatedBy: user.id, escalatedAt: now });
  if (transition === "send_back") Object.assign(changes, { submittedBy: null, submittedAt: null, escalatedBy: null, escalatedAt: null });
  if (kycWorkflow.terminal.includes(to)) Object.assign(changes, { decidedBy: user.id, decidedAt: now, decisionReason: reason });
  return db.transaction((tx) => {
    const updated = tx.update(kycCases).set(changes).where(eq(kycCases.id, id)).returning().get();
    audit(tx, { actorId: user.id, app: APP, action: `case.${transition}`, entity: { type: ENTITY, id }, before: { status: current.status }, after: { status: to }, reason });
    return updated;
  });
}

/** Active users who can be assigned cases: members of a group holding a role with `kyc.decide`. */
export function assignableAnalysts(db: Db): { id: string; displayName: string }[] {
  const roleKeys = kycApp.roles.filter((r) => (r.permissions as readonly string[]).includes("kyc.decide")).map((r) => r.key);
  const rows = db
    .selectDistinct({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(groupMembers, eq(groupMembers.userId, users.id))
    .innerJoin(groupRoles, eq(groupRoles.groupId, groupMembers.groupId))
    .where(and(inArray(groupRoles.roleKey, roleKeys), eq(users.active, true)))
    .all();
  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function reassignCase(db: Db, user: CurrentUser, id: string, input: z.infer<typeof reassignSchema>): KycCase {
  assertCan(user, "kyc.assign");
  const current = getCase(db, user, id);
  if (!current) throw new WorkflowError("Case not found");
  if (kycWorkflow.terminal.includes(current.status)) throw new WorkflowError("Closed cases can't be reassigned");
  if (current.assignedTo === input.assignedTo) throw new WorkflowError("The case is already assigned to this analyst");
  if (!assignableAnalysts(db).some((a) => a.id === input.assignedTo)) throw new WorkflowError("That user can't review KYC cases");
  return db.transaction((tx) => {
    const updated = tx.update(kycCases).set({ assignedTo: input.assignedTo }).where(eq(kycCases.id, id)).returning().get();
    audit(tx, {
      actorId: user.id,
      app: APP,
      action: "case.reassign",
      entity: { type: ENTITY, id },
      before: { assignedTo: current.assignedTo },
      after: { assignedTo: input.assignedTo },
      reason: input.reason || null,
    });
    return updated;
  });
}

export type SlaState = { tone: "success" | "warning" | "danger" | "neutral"; label: string; hoursLeft: number; breached: boolean };

const DUE_SOON_HOURS = 24;

function hoursLabel(h: number) {
  const a = Math.abs(h);
  return a >= 48 ? `${Math.round(a / 24)}d` : `${Math.round(a)}h`;
}

/** SLA aging. Open cases count down to the due date; closed cases show whether the SLA was met. */
export function slaState(c: Pick<KycCase, "status" | "slaDueAt" | "decidedAt">, now = Date.now()): SlaState {
  const due = Date.parse(c.slaDueAt);
  if (kycWorkflow.terminal.includes(c.status)) {
    const met = c.decidedAt ? Date.parse(c.decidedAt) <= due : true;
    return { tone: "neutral", label: met ? "Met" : "Missed", hoursLeft: 0, breached: !met };
  }
  const hoursLeft = (due - now) / 3_600_000;
  if (hoursLeft < 0) return { tone: "danger", label: `Breached ${hoursLabel(hoursLeft)} ago`, hoursLeft, breached: true };
  if (hoursLeft <= DUE_SOON_HOURS) return { tone: "warning", label: `Due in ${hoursLabel(hoursLeft)}`, hoursLeft, breached: false };
  return { tone: "success", label: `Due in ${hoursLabel(hoursLeft)}`, hoursLeft, breached: false };
}

export function kycStats(rows: KycCase[], user: CurrentUser, now = Date.now()) {
  const open = rows.filter((c) => !kycWorkflow.terminal.includes(c.status));
  const sla = open.map((c) => slaState(c, now));
  return {
    open: open.length,
    breached: sla.filter((s) => s.breached).length,
    dueSoon: sla.filter((s) => !s.breached && s.tone === "warning").length,
    awaitingSignoff: open.filter((c) => c.status === "pending_signoff").length,
    escalated: open.filter((c) => c.status === "escalated").length,
    unassigned: open.filter((c) => !c.assignedTo).length,
    mine: open.filter((c) => c.assignedTo === user.id).length,
  };
}

/** Queue view model: scoped rows (oldest SLA first) with SLA aging and headline stats, evaluated at one instant. Open cases first, most urgent SLA first. */
export function kycQueue(db: Db, user: CurrentUser, now = Date.now()) {
  const rows = listCases(db, user);
  const closed = (c: KycCase) => kycWorkflow.terminal.includes(c.status);
  const ordered = [...rows.filter((c) => !closed(c)), ...rows.filter(closed).sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))];
  return { rows: ordered.map((c) => ({ ...c, sla: slaState(c, now) })), stats: kycStats(rows, user, now) };
}
