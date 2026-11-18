import { defineApp } from "@acme/platform/registry";

export const kycApp = defineApp({
  key: "kyc",
  name: "KYC review queue",
  description: "Review customer identity-verification cases: approve, reject or escalate, with sanctions/PEP screening, SLA tracking and maker-checker.",
  href: "/apps/kyc",
  owner: "Compliance",
  accessPermission: "kyc.view",
  permissions: {
    "kyc.view": "Open the KYC review queue",
    "kyc.view_all": "See every case (otherwise only cases assigned to you)",
    "kyc.decide": "Approve standard cases; reject or escalate cases",
    "kyc.decide.elevated": "Approve high-risk or screening-hit cases and resolve escalations",
    "kyc.assign": "Assign and reassign cases to analysts",
    "kyc.pii.reveal": "Reveal customer PII (reason required, audited)",
    "kyc.admin": "Map Entra groups to KYC roles and see the app's activity log",
  },
  roles: [
    {
      key: "kyc.analyst",
      name: "Analyst",
      description: "Reviews cases assigned to them: approves standard cases, rejects or escalates.",
      permissions: ["kyc.view", "kyc.decide", "kyc.pii.reveal"],
    },
    {
      key: "kyc.lead",
      name: "Lead",
      description: "Sees all cases, assigns them, approves high-risk/screening-hit cases, resolves escalations and administers the app.",
      permissions: ["kyc.view", "kyc.view_all", "kyc.decide", "kyc.decide.elevated", "kyc.assign", "kyc.pii.reveal", "kyc.admin"],
    },
  ],
  // Lead is a superset of analyst, so there is no conflicting pair; maker-checker is enforced per case instead.
  sodConflicts: [],
});
