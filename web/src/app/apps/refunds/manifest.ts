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
    "refunds.approve.tier1": "Approve or reject refunds up to $500",
    "refunds.approve.tier2": "Approve or reject refunds up to $5,000",
    "refunds.approve.tier3": "Approve or reject refunds above $5,000",
    "refunds.pay": "Execute approved refunds via the payment processor",
    "refunds.admin": "See who has access to Refunds and its activity log",
    "refunds.pii.reveal": "Reveal customer contact details",
  },
  roles: [
    { key: "refunds.agent", name: "Refund agent", description: "Raises refunds; sees only their own.", permissions: ["refunds.view", "refunds.request"] },
    { key: "refunds.lead", name: "Team lead", description: "Approves refunds up to $500.", permissions: ["refunds.view", "refunds.view_all", "refunds.request", "refunds.approve.tier1"] },
    {
      key: "refunds.manager",
      name: "Payments manager",
      description: "Approves refunds up to $5,000.",
      permissions: ["refunds.view", "refunds.view_all", "refunds.approve.tier1", "refunds.approve.tier2", "refunds.pii.reveal", "refunds.admin"],
    },
    {
      key: "refunds.finance",
      name: "Finance operations",
      description: "Approves any amount and executes payouts.",
      permissions: ["refunds.view", "refunds.view_all", "refunds.approve.tier1", "refunds.approve.tier2", "refunds.approve.tier3", "refunds.pay", "refunds.pii.reveal"],
    },
  ],
  sodConflicts: [
    ["refunds.agent", "refunds.finance", "People who raise refunds must not also execute payouts"],
    ["refunds.lead", "refunds.finance", "People who raise refunds must not also execute payouts"],
  ],
});
