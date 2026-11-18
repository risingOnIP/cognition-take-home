import { groupMembers, groupRoles, groups, users, type Db } from "@acme/platform/db";

/**
 * Mirrors what would come from Entra ID: users, security groups and memberships.
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
    { id: "u_chris", displayName: "Chris Park", email: "chris.park@acmepay.com", jobTitle: "Software Engineer", department: "Engineering" },
  ],
  groups: [
    { id: "g_platform_admins", name: "sg-platform-admins", description: "Platform engineering admins" },
    { id: "g_internal_audit", name: "sg-internal-audit", description: "Internal audit (read-only)" },
    { id: "g_refunds_agents", name: "sg-refunds-agents", description: "Support agents who raise refunds" },
    { id: "g_refunds_leads", name: "sg-refunds-leads", description: "Support team leads" },
    { id: "g_payments_managers", name: "sg-payments-managers", description: "Payments operations managers" },
    { id: "g_finance_ops", name: "sg-finance-ops", description: "Finance operations (payouts)" },
    { id: "g_kyc_analysts", name: "sg-kyc-analysts", description: "KYC analysts" },
    { id: "g_kyc_leads", name: "sg-kyc-leads", description: "Compliance leads" },
  ],
  memberships: {
    g_platform_admins: ["u_alex"],
    g_internal_audit: ["u_jordan"],
    g_refunds_agents: ["u_priya", "u_taylor"],
    g_refunds_leads: ["u_marcus"],
    g_payments_managers: ["u_elena"],
    // Taylor is intentionally also in finance ops: a segregation-of-duties violation the admin app flags.
    g_finance_ops: ["u_sam", "u_taylor"],
    g_kyc_analysts: ["u_grace"],
    g_kyc_leads: ["u_diego"],
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
        { groupId: "g_platform_admins", roleKey: "platform.admin" },
        { groupId: "g_internal_audit", roleKey: "platform.auditor" },
      ])
      .run();
  });
}
