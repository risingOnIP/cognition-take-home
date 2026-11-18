import { groupMembers, groupRoles, groups, users, type Db } from "@acme/platform/db";

/**
 * Stand-in for the company's existing Entra ID tenant: users, security groups and memberships.
 * In production these are read from Entra (token claims / Graph), not seeded.
 * Apps add their own group -> role mappings in their seed (see src/app/apps/<app>/_lib/seed.ts).
 */
export const DIRECTORY = {
  users: [
    { id: "u_priya", displayName: "Priya Shah", email: "priya.shah@acmepay.com", jobTitle: "Support Agent", department: "Customer Support" },
    { id: "u_taylor", displayName: "Taylor Nguyen", email: "taylor.nguyen@acmepay.com", jobTitle: "Support Agent", department: "Customer Support" },
    { id: "u_marcus", displayName: "Marcus Lee", email: "marcus.lee@acmepay.com", jobTitle: "Support Team Lead", department: "Customer Support" },
    { id: "u_elena", displayName: "Elena Rossi", email: "elena.rossi@acmepay.com", jobTitle: "Payments Operations Manager", department: "Payments" },
    { id: "u_sam", displayName: "Sam Okafor", email: "sam.okafor@acmepay.com", jobTitle: "Finance Operations", department: "Finance" },
    { id: "u_grace", displayName: "Grace Kim", email: "grace.kim@acmepay.com", jobTitle: "KYC Analyst", department: "Compliance" },
    { id: "u_diego", displayName: "Diego Alvarez", email: "diego.alvarez@acmepay.com", jobTitle: "Compliance Lead", department: "Compliance" },
    { id: "u_alex", displayName: "Alex Morgan", email: "alex.morgan@acmepay.com", jobTitle: "Platform Engineer", department: "Engineering" },
    { id: "u_jordan", displayName: "Jordan Blake", email: "jordan.blake@acmepay.com", jobTitle: "Internal Auditor", department: "Risk" },
    { id: "u_avery", displayName: "Avery Demo", email: "avery.demo@acmepay.com", jobTitle: "Demo superuser (every app)", department: "Demo" },
    { id: "u_chris", displayName: "Chris Park", email: "chris.park@acmepay.com", jobTitle: "Software Engineer", department: "Engineering" },
  ],
  groups: [
    { id: "g_support", name: "sg-support", description: "Customer support agents" },
    { id: "g_payments", name: "sg-payments", description: "Payments operations" },
    { id: "g_finance", name: "sg-finance", description: "Finance operations" },
    { id: "g_compliance", name: "sg-compliance", description: "Compliance analysts" },
    { id: "g_compliance_leads", name: "sg-compliance-leads", description: "Compliance leads" },
    { id: "g_internal_audit", name: "sg-internal-audit", description: "Internal audit" },
    { id: "g_engineering", name: "sg-engineering", description: "Engineering" },
    { id: "g_demo_superusers", name: "sg-demo-superusers", description: "Demo only: every app role that does not break segregation of duties" },
  ],
  memberships: {
    g_support: ["u_priya", "u_taylor", "u_marcus"],
    g_payments: ["u_elena"],
    g_finance: ["u_sam"],
    g_compliance: ["u_grace"],
    g_compliance_leads: ["u_diego"],
    g_internal_audit: ["u_jordan"],
    g_engineering: ["u_alex", "u_chris"],
    g_demo_superusers: ["u_avery"],
  } as Record<string, string[]>,
};

export function seedDirectory(db: Db) {
  db.transaction((tx) => {
    tx.insert(users)
      .values(DIRECTORY.users.map((u) => ({ ...u, entraObjectId: `entra-${u.id}` })))
      .run();
    tx.insert(groups)
      .values(DIRECTORY.groups.map((g) => ({ ...g, entraObjectId: `entra-${g.id}` })))
      .run();
    tx.insert(groupMembers)
      .values(Object.entries(DIRECTORY.memberships).flatMap(([groupId, ids]) => ids.map((userId) => ({ groupId, userId }))))
      .run();
    tx.insert(groupRoles)
      .values([
        { groupId: "g_internal_audit", roleKey: "platform.auditor" },
        // Demo superuser: every admin/approver role. Not refunds.agent, which would conflict with refunds.finance (SoD).
        ...["platform.auditor", "refunds.approver", "refunds.finance", "kyc.lead"].map((roleKey) => ({ groupId: "g_demo_superusers", roleKey })),
      ])
      .run();
  });
}
