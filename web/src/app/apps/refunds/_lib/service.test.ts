import { describe, expect, it } from "vitest";
import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import { createMockPaymentProcessor } from "@acme/platform/connectors";
import { buildRoleCatalog } from "@acme/platform/registry";
import { createTestDb, createTestUser } from "@acme/platform/testing";
import { refundsApp } from "../manifest";
import * as schema from "./schema";
import { createRefund, decideRefund, getRefund, listRefunds, payRefund } from "./service";

const catalog = buildRoleCatalog([refundsApp]);

async function setup() {
  const db = await createTestDb(schema);
  return {
    db,
    agent: createTestUser(db, catalog, "agent", ["refunds.agent"]),
    otherAgent: createTestUser(db, catalog, "agent2", ["refunds.agent"]),
    lead: createTestUser(db, catalog, "lead", ["refunds.lead"]),
    manager: createTestUser(db, catalog, "manager", ["refunds.manager"]),
    finance: createTestUser(db, catalog, "finance", ["refunds.finance"]),
  };
}

const input = { paymentId: "pay_abc", customerName: "Jane Doe", customerEmail: "jane@example.com", amount: 120_000, reasonCode: "billing_error" as const };

describe("refunds service", () => {
  it("routes approval by amount and enforces maker-checker", async () => {
    const { db, agent, lead, manager } = await setup();
    const r = createRefund(db, agent, input);
    expect(() => decideRefund(db, lead, r.id, "approve", null)).toThrow(/tier2/);
    expect(decideRefund(db, manager, r.id, "approve", null).status).toBe("approved");

    const own = createRefund(db, lead, { ...input, amount: 1_000 });
    expect(() => decideRefund(db, lead, own.id, "approve", null)).toThrow(/Maker-checker/);
  });

  it("applies row-level security", async () => {
    const { db, agent, otherAgent, lead } = await setup();
    const r = createRefund(db, agent, input);
    expect(listRefunds(db, otherAgent)).toHaveLength(0);
    expect(getRefund(db, otherAgent, r.id)).toBeNull();
    expect(listRefunds(db, lead)).toHaveLength(1);
  });

  it("pays out idempotently via the connector and audits every step", async () => {
    const { db, agent, manager, finance } = await setup();
    let calls = 0;
    const base = createMockPaymentProcessor();
    const processor = { ...base, refund: async (req: Parameters<typeof base.refund>[0]) => (calls++, base.refund(req)) };
    const r = createRefund(db, agent, input);
    decideRefund(db, manager, r.id, "approve", "ok");
    const paid = await payRefund(db, finance, r.id, processor);
    expect(paid.status).toBe("paid");
    await expect(payRefund(db, finance, r.id, processor)).rejects.toThrow(/Cannot execute payout a paid/);
    expect(calls).toBe(1);
    expect(listAuditEvents(db, { entityId: r.id }).map((e) => e.action)).toEqual(["refund.pay", "refund.approve", "refund.request"]);
    expect(verifyAuditChain(db).ok).toBe(true);
  });
});
