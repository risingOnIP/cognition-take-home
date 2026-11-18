import { describe, expect, it } from "vitest";
import { maskPii, revealPii } from ".";
import { listAuditEvents } from "../audit";
import { buildRoleCatalog, defineApp } from "../registry";
import { createTestDb, createTestUser } from "../testing";
import { runIdempotent } from "../idempotency";

const app = defineApp({
  key: "kyc", name: "KYC", description: "", href: "/", owner: "", accessPermission: "kyc.view",
  permissions: { "kyc.view": "", "kyc.pii.reveal": "" },
  roles: [
    { key: "kyc.viewer", name: "", description: "", permissions: ["kyc.view"] },
    { key: "kyc.analyst", name: "", description: "", permissions: ["kyc.view", "kyc.pii.reveal"] },
  ],
});
const catalog = buildRoleCatalog([app]);

describe("pii", () => {
  it("masks", () => {
    expect(maskPii("123-45-6789", "ssn")).toBe("***-**-6789");
    expect(maskPii("jane@example.com", "email")).toBe("j***@example.com");
    expect(maskPii("Jane Doe", "name")).toBe("J*** D**");
  });

  it("reveal requires permission + reason and is audited", async () => {
    const db = await createTestDb();
    const args = { permission: "kyc.pii.reveal", app: "kyc", entity: { type: "case", id: "c1" }, field: "ssn", value: "123-45-6789" };
    const viewer = createTestUser(db, catalog, "v", ["kyc.viewer"]);
    expect(() => revealPii(db, { ...args, user: viewer, reason: "curious" })).toThrow(/Access denied/);
    const analyst = createTestUser(db, catalog, "a", ["kyc.analyst"]);
    expect(() => revealPii(db, { ...args, user: analyst, reason: " " })).toThrow(/reason/);
    expect(revealPii(db, { ...args, user: analyst, reason: "verify ID match" })).toBe("123-45-6789");
    expect(listAuditEvents(db)).toMatchObject([{ action: "pii.reveal", actorId: "a", reason: "verify ID match" }]);
  });
});

describe("idempotency", () => {
  it("executes once per key", async () => {
    const db = await createTestDb();
    let calls = 0;
    const fn = async () => ({ n: ++calls });
    expect(await runIdempotent(db, "refund", "k1", fn)).toEqual({ result: { n: 1 }, replayed: false });
    expect(await runIdempotent(db, "refund", "k1", fn)).toEqual({ result: { n: 1 }, replayed: true });
    expect(calls).toBe(1);
  });
});
