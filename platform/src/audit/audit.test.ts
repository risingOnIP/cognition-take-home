import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { audit, listAuditEvents, verifyAuditChain } from ".";
import { createTestDb } from "../testing";

describe("audit", () => {
  it("hash-chains events and verifies", async () => {
    const db = await createTestDb();
    db.transaction((tx) => {
      audit(tx, { actorId: "u1", app: "t", action: "create", entity: { type: "x", id: "1" }, after: { a: 1 } });
      audit(tx, { actorId: "u2", app: "t", action: "update", entity: { type: "x", id: "1" }, before: { a: 1 }, after: { a: 2 }, reason: "fix" });
    });
    expect(verifyAuditChain(db)).toEqual({ ok: true, checked: 2 });
    expect(listAuditEvents(db, { entityId: "1" })[0]?.action).toBe("update");
  });

  it("rolls back with the surrounding transaction", async () => {
    const db = await createTestDb();
    expect(() =>
      db.transaction((tx) => {
        audit(tx, { actorId: "u1", app: "t", action: "create", entity: { type: "x", id: "1" } });
        throw new Error("business write failed");
      }),
    ).toThrow();
    expect(listAuditEvents(db)).toHaveLength(0);
  });

  it("blocks UPDATE/DELETE and detects tampering if triggers are bypassed", async () => {
    const db = await createTestDb();
    db.transaction((tx) => {
      audit(tx, { actorId: "u1", app: "t", action: "refund.approve", entity: { type: "refund", id: "1" }, after: { amount: 100 } });
      audit(tx, { actorId: "u1", app: "t", action: "refund.pay", entity: { type: "refund", id: "1" } });
    });
    const raw = (db as unknown as { $client: Database.Database }).$client;
    expect(() => raw.exec("UPDATE audit_events SET actor_id = 'mallory'")).toThrow(/append-only/);
    expect(() => raw.exec("DELETE FROM audit_events")).toThrow(/append-only/);
    raw.exec("DROP TRIGGER audit_events_no_update");
    raw.exec("UPDATE audit_events SET after = '{\"amount\":999}' WHERE seq = 1");
    expect(verifyAuditChain(db)).toMatchObject({ ok: false, brokenAt: 1 });
  });
});
