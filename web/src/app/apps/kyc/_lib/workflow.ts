import type { CurrentUser } from "@acme/platform/rbac";
import { defineWorkflow, WorkflowError } from "@acme/platform/workflow";
import type { CaseStatus, KycCase } from "./schema";

/** The fields the workflow needs; both raw cases and masked case views satisfy it. */
export type KycWorkflowSubject = Pick<KycCase, "status" | "createdBy" | "riskLevel" | "screeningHits" | "escalatedBy">;
export type KycTransition = "approve" | "reject" | "escalate";

/** High-risk cases, screening hits and escalations need a lead. */
export function needsLead(c: KycWorkflowSubject): boolean {
  return c.riskLevel === "high" || c.screeningHits.length > 0 || c.status === "escalated";
}

export function leadReasons(c: KycWorkflowSubject): string[] {
  return [c.riskLevel === "high" && "high risk", c.screeningHits.length > 0 && "sanctions/PEP screening hit", c.status === "escalated" && "escalated"].filter(
    (x): x is string => !!x,
  );
}

export const kycWorkflow = defineWorkflow<CaseStatus, KycWorkflowSubject, KycTransition>({
  name: "kyc_case",
  states: ["in_review", "escalated", "approved", "rejected"],
  initial: "in_review",
  terminal: ["approved", "rejected"],
  transitions: {
    approve: {
      label: "Approve",
      from: ["in_review", "escalated"],
      to: "approved",
      permission: (c) => (needsLead(c) ? "kyc.decide.elevated" : "kyc.decide"),
      makerChecker: true,
    },
    reject: {
      label: "Reject",
      from: ["in_review", "escalated"],
      to: "rejected",
      permission: (c) => (c.status === "escalated" ? "kyc.decide.elevated" : "kyc.decide"),
      requireReason: true,
    },
    escalate: { label: "Escalate to lead", from: ["in_review"], to: "escalated", permission: "kyc.decide", requireReason: true },
  },
});

/**
 * The platform's maker-checker compares against `createdBy`. For KYC the "maker" of an approval is
 * whoever escalated the case, so the workflow sees the escalator as the maker.
 */
function asMaker(c: KycWorkflowSubject): KycWorkflowSubject {
  return { ...c, createdBy: c.escalatedBy ?? c.createdBy };
}

export function checkCase(t: KycTransition, c: KycWorkflowSubject, user: CurrentUser, reason?: string | null): string | null {
  if (t === "approve" && c.escalatedBy === user.id && kycWorkflow.transitions.approve.from.includes(c.status)) {
    return "Maker-checker: you escalated this case, so another lead must approve it.";
  }
  return kycWorkflow.check(t, asMaker(c), user, reason);
}

export function applyCase(t: KycTransition, c: KycWorkflowSubject, user: CurrentUser, reason?: string | null): CaseStatus {
  const err = checkCase(t, c, user, reason);
  if (err) throw new WorkflowError(err);
  return kycWorkflow.apply(t, asMaker(c), user, reason);
}

export function availableCase(c: KycWorkflowSubject, user: CurrentUser): KycTransition[] {
  return kycWorkflow.available(asMaker(c), user).filter((t) => !checkCase(t, c, user, "x"));
}
