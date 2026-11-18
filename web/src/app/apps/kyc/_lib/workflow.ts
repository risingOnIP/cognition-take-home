import type { CurrentUser } from "@acme/platform/rbac";
import { defineWorkflow, WorkflowError } from "@acme/platform/workflow";
import type { KycCase, KycStatus } from "./schema";

export type KycTransition = "approve" | "reject" | "escalate" | "submit_for_signoff" | "send_back";

/** Enhanced due diligence: high risk or any sanctions/PEP hit needs a compliance lead's sign-off to approve. */
export function requiresSignoff(c: Pick<KycCase, "riskLevel" | "sanctionsHit" | "pepHit">): boolean {
  return c.riskLevel === "high" || c.sanctionsHit || c.pepHit;
}

export function riskLevelFor(score: number): KycCase["riskLevel"] {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

/** Who must act at each stage: analysts review, leads sign off and resolve escalations. */
const byStage = (review: string, signoff: string, escalated: string) => (c: KycCase) =>
  c.status === "pending_signoff" ? signoff : c.status === "escalated" ? escalated : review;

const stagePermission = byStage("kyc.decide", "kyc.signoff", "kyc.escalation.resolve");

export const kycWorkflow = defineWorkflow<KycStatus, KycCase, KycTransition>({
  name: "kyc_case",
  states: ["pending_review", "pending_signoff", "escalated", "approved", "rejected"],
  initial: "pending_review",
  terminal: ["approved", "rejected"],
  transitions: {
    approve: { label: "Approve", from: ["pending_review", "pending_signoff", "escalated"], to: "approved", permission: stagePermission, makerChecker: true },
    reject: { label: "Reject", from: ["pending_review", "pending_signoff", "escalated"], to: "rejected", permission: stagePermission, makerChecker: true, requireReason: true },
    escalate: { label: "Escalate", from: ["pending_review"], to: "escalated", permission: "kyc.decide", requireReason: true },
    submit_for_signoff: { label: "Submit for lead sign-off", from: ["pending_review"], to: "pending_signoff", permission: "kyc.decide" },
    send_back: { label: "Send back to analyst", from: ["pending_signoff", "escalated"], to: "pending_review", permission: stagePermission, makerChecker: true, requireReason: true },
  },
});

/**
 * The platform's maker-checker compares `createdBy` with the actor. In KYC the "maker" depends on the
 * stage: the analyst who submitted for sign-off, or whoever escalated. Nobody may check their own work.
 */
function asWorkflowEntity(c: KycCase): KycCase {
  const maker = c.status === "pending_signoff" ? c.submittedBy : c.status === "escalated" ? c.escalatedBy : null;
  return { ...c, createdBy: maker ?? "" };
}

/** App-specific guards the generic workflow can't express (it has no per-transition conditions). */
function guard(t: KycTransition, c: KycCase, user: CurrentUser): string | null {
  if (c.status !== "pending_review") return null;
  if (c.assignedTo !== user.id) return c.assignedTo ? "Only the assigned analyst can act on this case" : "This case is not assigned yet";
  if (t === "approve" && requiresSignoff(c)) return "High-risk or screening-hit cases need a compliance lead's sign-off: submit for sign-off";
  if (t === "submit_for_signoff" && !requiresSignoff(c)) return "Standard-risk cases can be approved directly";
  return null;
}

export function checkKyc(t: KycTransition, c: KycCase, user: CurrentUser, reason?: string | null): string | null {
  return kycWorkflow.check(t, asWorkflowEntity(c), user, reason) ?? guard(t, c, user);
}

export function applyKyc(t: KycTransition, c: KycCase, user: CurrentUser, reason?: string | null): KycStatus {
  const err = checkKyc(t, c, user, reason);
  if (err) throw new WorkflowError(err);
  return kycWorkflow.transitions[t].to;
}

export function availableKyc(c: KycCase, user: CurrentUser): KycTransition[] {
  return (Object.keys(kycWorkflow.transitions) as KycTransition[]).filter((t) => !checkKyc(t, c, user, "x"));
}

/** Why the user has no actions on this case (shown instead of buttons). */
export function blockedReason(c: KycCase, user: CurrentUser): string | null {
  if (kycWorkflow.terminal.includes(c.status)) return "This case is closed.";
  const primary: KycTransition = c.status === "pending_review" && requiresSignoff(c) ? "submit_for_signoff" : "approve";
  return checkKyc(primary, c, user, "x");
}

export function transitionLabel(t: KycTransition, c: KycCase): string {
  if (t === "approve" && c.status === "pending_signoff") return "Sign off & approve";
  if (t === "approve" && c.status === "escalated") return "Resolve: approve";
  if (t === "reject" && c.status === "escalated") return "Resolve: reject";
  return kycWorkflow.transitions[t].label;
}
