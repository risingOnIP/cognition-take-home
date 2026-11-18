import { describe, expect, it } from "vitest";
import { findSodViolations, loadUser, sodViolationsIfGranted, visibleApps } from ".";
import { syncEntraClaims } from "../auth";
import { groupRoles, groups } from "../db";
import { buildRoleCatalog, defineApp, platformAdminApp } from "../registry";
import { createTestDb, createTestUser } from "../testing";

const app = defineApp({
  key: "refunds",
  name: "Refunds",
  description: "",
  href: "/apps/refunds",
  owner: "Payments",
  accessPermission: "refunds.view",
  permissions: { "refunds.view": "", "refunds.request": "", "refunds.approve": "" },
  roles: [
    { key: "refunds.agent", name: "Agent", description: "", permissions: ["refunds.view", "refunds.request"] },
    { key: "refunds.approver", name: "Approver", description: "", permissions: ["refunds.view", "refunds.approve"] },
  ],
  sodConflicts: [["refunds.agent", "refunds.approver", "Requesters must not approve"]],
});
const catalog = buildRoleCatalog([platformAdminApp, app]);

describe("rbac", () => {
  it("rejects roles that grant undeclared permissions", () => {
    expect(() => defineApp({ ...app, roles: [{ key: "x", name: "x", description: "", permissions: ["nope"] }] })).toThrow(/undeclared/);
  });

  it("resolves groups -> roles -> permissions and filters the launcher", async () => {
    const db = await createTestDb();
    const agent = createTestUser(db, catalog, "alice", ["refunds.agent"]);
    expect([...agent.permissions].sort()).toEqual(["refunds.request", "refunds.view"]);
    expect(visibleApps(catalog, agent).map((a) => a.key)).toEqual(["refunds"]);
    expect(visibleApps(catalog, createTestUser(db, catalog, "nobody", [])).length).toBe(0);
  });

  it("detects segregation-of-duties conflicts, current and prospective", async () => {
    const db = await createTestDb();
    createTestUser(db, catalog, "bob", ["refunds.agent", "refunds.approver"]);
    expect(findSodViolations(db, catalog)).toMatchObject([{ userId: "bob" }]);
    const carol = createTestUser(db, catalog, "carol", ["refunds.agent"]);
    expect(sodViolationsIfGranted(db, catalog, carol.groups[0]!.id, "refunds.approver")).toMatchObject([{ userId: "carol" }]);
  });

  it("syncs Entra claims into directory memberships (JIT provisioning)", async () => {
    const db = await createTestDb();
    db.insert(groups).values({ id: "g1", name: "sg-refund-agents", entraObjectId: "entra-g1" }).run();
    db.insert(groupRoles).values({ groupId: "g1", roleKey: "refunds.agent" }).run();
    const id = syncEntraClaims(db, { oid: "oid-1", preferred_username: "dee@acme.com", name: "Dee", groups: ["entra-g1", "unknown"] });
    expect(loadUser(db, catalog, id)?.roles).toEqual(["refunds.agent"]);
    syncEntraClaims(db, { oid: "oid-1", preferred_username: "dee@acme.com", name: "Dee", groups: [] });
    expect(loadUser(db, catalog, id)?.roles).toEqual([]);
  });
});
