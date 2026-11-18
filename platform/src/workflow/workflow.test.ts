import { describe, expect, it } from "vitest";
import { approvalTier, defineWorkflow, WorkflowError } from ".";
import type { CurrentUser } from "../rbac";

const user = (id: string, perms: string[]): CurrentUser => ({
  id, email: id, displayName: id, jobTitle: null, department: null, groups: [], roles: [], permissions: new Set(perms),
});

const tiers = [
  { maxMinor: 50_000, permission: "r.approve.t1", label: "Team lead" },
  { permission: "r.approve.t2", label: "Finance" },
] as const;

type Item = { status: "pending" | "approved" | "rejected"; createdBy: string; amountMinor: number };
const wf = defineWorkflow<Item["status"], Item, "approve" | "reject">({
  name: "test",
  states: ["pending", "approved", "rejected"],
  initial: "pending",
  terminal: ["approved", "rejected"],
  transitions: {
    approve: { label: "Approve", from: ["pending"], to: "approved", permission: (e) => approvalTier(tiers, e.amountMinor).permission, makerChecker: true },
    reject: { label: "Reject", from: ["pending"], to: "rejected", permission: "r.approve.t1", requireReason: true },
  },
});

describe("workflow", () => {
  const item: Item = { status: "pending", createdBy: "maker", amountMinor: 10_000 };

  it("enforces maker-checker even when the maker holds the permission", () => {
    expect(() => wf.apply("approve", item, user("maker", ["r.approve.t1"]))).toThrow(/Maker-checker/);
    expect(wf.apply("approve", item, user("checker", ["r.approve.t1"]))).toBe("approved");
  });

  it("routes by approval limit", () => {
    const big = { ...item, amountMinor: 900_000 };
    expect(wf.check("approve", big, user("lead", ["r.approve.t1"]))).toMatch(/r\.approve\.t2/);
    expect(wf.check("approve", big, user("fin", ["r.approve.t2"]))).toBeNull();
  });

  it("requires a reason and valid from-state", () => {
    const lead = user("lead", ["r.approve.t1"]);
    expect(() => wf.apply("reject", item, lead, "")).toThrow(WorkflowError);
    expect(wf.apply("reject", item, lead, "duplicate")).toBe("rejected");
    expect(wf.check("approve", { ...item, status: "approved" }, lead)).toMatch(/Cannot approve/);
  });

  it("lists available transitions for the UI", () => {
    expect(wf.available(item, user("maker", ["r.approve.t1"]))).toEqual(["reject"]);
    expect(wf.available(item, user("lead", ["r.approve.t1"]))).toEqual(["approve", "reject"]);
  });
});
