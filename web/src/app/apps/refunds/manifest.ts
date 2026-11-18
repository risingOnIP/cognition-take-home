import { defineApp } from "@acme/platform/registry";

export const refundsApp = defineApp({
  key: "refunds",
  name: "Refunds",
  description: "Request, approve and pay out customer refunds with tiered approval limits and maker-checker.",
  href: "/apps/refunds",
  owner: "Payments Operations",
  accessPermission: "refunds.view",
  permissions: {
    "refunds.view": "Open the Refunds app",
    "refunds.view_all": "See refunds raised by anyone (otherwise only your own)",
    "refunds.request": "Raise a refund request",
    "refunds.approve.standard": "Approve or reject refunds up to $5,000",
    "refunds.approve.large": "Approve or reject refunds above $5,000",
    "refunds.pay": "Execute approved refunds via the payment processor",
    "refunds.admin": "See who has access to Refunds and its activity log",
    "refunds.pii.reveal": "Reveal customer contact details",
  },
  roles: [
    { key: "refunds.agent", name: "Agent", description: "Raises refunds; sees only their own.", permissions: ["refunds.view", "refunds.request"] },
    {
      key: "refunds.approver",
      name: "Approver",
      description: "Approves refunds up to $5,000 and administers the app.",
      permissions: ["refunds.view", "refunds.view_all", "refunds.approve.standard", "refunds.pii.reveal", "refunds.admin"],
    },
    {
      key: "refunds.finance",
      name: "Finance",
      description: "Approves refunds above $5,000 and executes payouts.",
      permissions: ["refunds.view", "refunds.view_all", "refunds.approve.standard", "refunds.approve.large", "refunds.pay", "refunds.pii.reveal"],
    },
  ],
  sodConflicts: [["refunds.agent", "refunds.finance", "People who raise refunds must not also execute payouts"]],
});
