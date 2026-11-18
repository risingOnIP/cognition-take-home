import { approvalTier, defineWorkflow, type ApprovalTier } from "@acme/platform/workflow";
import type { Refund, RefundStatus } from "./schema";

export const APPROVAL_TIERS: ApprovalTier[] = [
  { maxMinor: 50_000, permission: "refunds.approve.tier1", label: "Team lead (≤ $500)" },
  { maxMinor: 500_000, permission: "refunds.approve.tier2", label: "Payments manager (≤ $5,000)" },
  { permission: "refunds.approve.tier3", label: "Finance (> $5,000)" },
];

const tierPermission = (r: Refund) => approvalTier(APPROVAL_TIERS, r.amountMinor).permission;

export const refundWorkflow = defineWorkflow<RefundStatus, Refund, "approve" | "reject" | "pay">({
  name: "refund",
  states: ["pending_approval", "approved", "rejected", "paid", "failed"],
  initial: "pending_approval",
  terminal: ["rejected", "paid", "failed"],
  transitions: {
    approve: { label: "Approve", from: ["pending_approval"], to: "approved", permission: tierPermission, makerChecker: true },
    reject: { label: "Reject", from: ["pending_approval"], to: "rejected", permission: tierPermission, makerChecker: true, requireReason: true },
    pay: { label: "Execute payout", from: ["approved"], to: "paid", permission: "refunds.pay", makerChecker: true },
  },
});
