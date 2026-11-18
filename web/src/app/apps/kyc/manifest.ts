import { defineApp } from "@acme/platform/registry";

export const kycApp = defineApp({
  key: "kyc",
  name: "KYC Review",
  description: "Review customer identity-verification cases with risk-based lead sign-off, maker-checker on escalations and SLA tracking.",
  href: "/apps/kyc",
  owner: "Compliance",
  accessPermission: "kyc.view",
  permissions: {
    "kyc.view": "Open the KYC review queue",
    "kyc.view_all": "See every case (otherwise only cases assigned to you)",
    "kyc.decide": "Approve, reject or escalate cases assigned to you",
    "kyc.signoff": "Sign off approvals of high-risk or screening-hit cases",
    "kyc.escalation.resolve": "Resolve escalated cases",
    "kyc.assign": "Assign and reassign cases to analysts",
    "kyc.pii.reveal": "Reveal masked customer PII (reason required, audited)",
  },
  roles: [
    {
      key: "kyc.analyst",
      name: "KYC analyst",
      description: "Reviews cases assigned to them.",
      permissions: ["kyc.view", "kyc.decide", "kyc.pii.reveal"],
    },
    {
      key: "kyc.lead",
      name: "Compliance lead",
      description: "Sees all cases, assigns work, signs off high-risk approvals and resolves escalations.",
      permissions: ["kyc.view", "kyc.view_all", "kyc.decide", "kyc.signoff", "kyc.escalation.resolve", "kyc.assign", "kyc.pii.reveal"],
    },
    {
      key: "kyc.auditor",
      name: "Internal auditor",
      description: "Read-only access to every case and its history.",
      permissions: ["kyc.view", "kyc.view_all"],
    },
  ],
  sodConflicts: [
    ["kyc.analyst", "kyc.auditor", "Internal audit must be independent of the KYC reviews it audits"],
    ["kyc.lead", "kyc.auditor", "Internal audit must be independent of the KYC reviews it audits"],
  ],
});
