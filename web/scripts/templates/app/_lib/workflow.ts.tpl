import { defineWorkflow } from "@acme/platform/workflow";
import type { __Pascal__Item } from "./schema";

export const __camel__Workflow = defineWorkflow<__Pascal__Item["status"], __Pascal__Item, "approve" | "reject">({
  name: "__key__",
  states: ["pending", "approved", "rejected"],
  initial: "pending",
  terminal: ["approved", "rejected"],
  transitions: {
    approve: { label: "Approve", from: ["pending"], to: "approved", permission: "__key__.approve", makerChecker: true },
    reject: { label: "Reject", from: ["pending"], to: "rejected", permission: "__key__.approve", makerChecker: true, requireReason: true },
  },
});
