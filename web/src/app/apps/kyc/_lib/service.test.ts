import { describe, expect, it } from "vitest";
import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import type { Db } from "@acme/platform/db";
import { buildRoleCatalog } from "@acme/platform/registry";
import { createTestDb, createTestUser } from "@acme/platform/testing";
import { kycApp } from "../manifest";
import * as schema from "./schema";
import { assignCase, caseSla, decideCase, getCase, listCases, queueStats, revealCaseField } from "./service";

const catalog = buildRoleCatalog([kycApp]);
const HOUR = 3_600_000;
const NOW = Date.parse("2026-11-18T12:00:00Z");

async function setup() {
  const db = await createTestDb(schema);
  return {
    db,
    analyst: createTestUser(db, catalog, "analyst", ["kyc.analyst"]),
    otherAnalyst: createTestUser(db, catalog, "analyst2", ["kyc.analyst"]),
    lead: createTestUser(db, catalog, "lead", ["kyc.lead"]),
    otherLead: createTestUser(db, catalog, "lead2", ["kyc.lead"]),
    outsider: createTestUser(db, catalog, "outsider", []),
  };
}

let n = 0;
function insertCase(db: Db, overrides: Partial<schema.KycCase> = {}): schema.KycCase {
  return db
    .insert(schema.kycCases)
    .values({
      id: `KYC-${++n}`,
      customerName: "Jane Doe",
      dateOfBirth: "1984-03-09",
      nationalId: "123-45-6789",
      address: "1 Main St, Springfield, IL 62704",
      email: "jane.doe@example.com",
      documentType: "passport",
      riskLevel: "low",
      screeningHits: [],
      assignedTo: "analyst",
      status: "in_review",
      slaDueAt: new Date(NOW + 48 * HOUR).toISOString(),
      createdBy: schema.INTAKE_ACTOR,
      createdAt: new Date(NOW - HOUR).toISOString(),
      ...overrides,
    })
    .returning()
    .get();
}

describe("kyc service", () => {
  it("scopes analysts to cases assigned to them; leads see all", async () => {
    const { db, analyst, otherAnalyst, lead } = await setup();
    const mine = insertCase(db);
    insertCase(db, { assignedTo: "analyst2" });
    insertCase(db, { assignedTo: null });
    expect(listCases(db, analyst).map((c) => c.id)).toEqual([mine.id]);
    expect(getCase(db, otherAnalyst, mine.id)).toBeNull();
    expect(() => decideCase(db, otherAnalyst, mine.id, "approve", null)).toThrow(/not found/);
    expect(listCases(db, lead)).toHaveLength(3);
  });

  it("denies people without a KYC role", async () => {
    const { db, outsider } = await setup();
    const c = insertCase(db);
    expect(() => listCases(db, outsider)).toThrow(/Access denied/);
    expect(() => getCase(db, outsider, c.id)).toThrow(/Access denied/);
  });

  it("lets analysts approve standard cases but needs a lead for high risk or screening hits", async () => {
    const { db, analyst, lead } = await setup();
    expect(decideCase(db, analyst, insertCase(db).id, "approve", null).status).toBe("approved");
    const high = insertCase(db, { riskLevel: "high" });
    const hit = insertCase(db, { screeningHits: [{ kind: "pep", list: "PEP", matchScore: 90 }] });
    expect(() => decideCase(db, analyst, high.id, "approve", null)).toThrow(/kyc.decide.elevated/);
    expect(() => decideCase(db, analyst, hit.id, "approve", null)).toThrow(/kyc.decide.elevated/);
    expect(decideCase(db, lead, high.id, "approve", null).status).toBe("approved");
    expect(decideCase(db, lead, hit.id, "approve", null).status).toBe("approved");
  });

  it("requires a reason to reject or escalate", async () => {
    const { db, analyst } = await setup();
    const c = insertCase(db);
    expect(() => decideCase(db, analyst, c.id, "reject", null)).toThrow(/reason is required/);
    expect(() => decideCase(db, analyst, c.id, "escalate", "  ")).toThrow(/reason is required/);
    expect(decideCase(db, analyst, c.id, "reject", "Document expired").status).toBe("rejected");
    expect(() => decideCase(db, analyst, c.id, "approve", null)).toThrow(/Cannot approve a rejected/);
  });

  it("routes escalations to leads and blocks whoever escalated from approving (maker-checker)", async () => {
    const { db, analyst, lead, otherLead } = await setup();
    const c = insertCase(db);
    const escalated = decideCase(db, analyst, c.id, "escalate", "Possible PEP");
    expect(escalated).toMatchObject({ status: "escalated", escalatedBy: "analyst" });
    expect(() => decideCase(db, analyst, c.id, "approve", null)).toThrow();
    expect(() => decideCase(db, analyst, c.id, "reject", "no")).toThrow(/kyc.decide.elevated/);
    expect(decideCase(db, lead, c.id, "approve", null).status).toBe("approved");

    const own = insertCase(db, { assignedTo: "lead", riskLevel: "high" });
    decideCase(db, lead, own.id, "escalate", "Second opinion");
    expect(() => decideCase(db, lead, own.id, "approve", null)).toThrow(/Maker-checker/);
    expect(decideCase(db, otherLead, own.id, "approve", null).status).toBe("approved");
  });

  it("lets only leads assign; reassigning needs a reason and moves visibility", async () => {
    const { db, analyst, otherAnalyst, lead } = await setup();
    const c = insertCase(db, { assignedTo: null });
    expect(() => assignCase(db, analyst, c.id, { assigneeId: "analyst" })).toThrow(/Access denied/);
    expect(() => assignCase(db, lead, c.id, { assigneeId: "outsider" })).toThrow(/does not hold a KYC role/);
    expect(assignCase(db, lead, c.id, { assigneeId: "analyst" }).assignedTo).toBe("analyst");
    expect(() => assignCase(db, lead, c.id, { assigneeId: "analyst2" })).toThrow(/reason is required/);
    assignCase(db, lead, c.id, { assigneeId: "analyst2", reason: "Rebalancing workload" });
    expect(getCase(db, analyst, c.id)).toBeNull();
    expect(getCase(db, otherAnalyst, c.id)?.assignedTo).toBe("analyst2");
  });

  it("masks PII by default and reveals one field with a reason, audited", async () => {
    const { db, analyst, otherAnalyst } = await setup();
    const c = insertCase(db);
    const view = getCase(db, analyst, c.id)!;
    expect(JSON.stringify(view)).not.toMatch(/Jane|123-45-6789|1984-03-09|jane\.doe|Main St/);
    expect(view.masked).toMatchObject({ nationalId: "***-**-6789", email: "j***@example.com" });
    expect(() => revealCaseField(db, analyst, c.id, "nationalId", " ")).toThrow(/reason is required/);
    expect(() => revealCaseField(db, analyst, c.id, "status", "x")).toThrow(/Unknown field/);
    expect(() => revealCaseField(db, otherAnalyst, c.id, "nationalId", "check")).toThrow(/not found/);
    expect(revealCaseField(db, analyst, c.id, "nationalId", "Verify against document")).toBe("123-45-6789");
    const [event] = listAuditEvents(db, { entityId: c.id });
    expect(event).toMatchObject({ action: "pii.reveal", actorId: "analyst", reason: "Verify against document" });
  });

  it("computes SLA aging and breaches", async () => {
    const due = new Date(NOW).toISOString();
    expect(caseSla({ status: "in_review", slaDueAt: due, decidedAt: null }, NOW - 30 * HOUR)).toEqual({ state: "on_track", hoursLeft: 30 });
    expect(caseSla({ status: "in_review", slaDueAt: due, decidedAt: null }, NOW - 5 * HOUR)).toEqual({ state: "due_soon", hoursLeft: 5 });
    expect(caseSla({ status: "escalated", slaDueAt: due, decidedAt: null }, NOW + 3 * HOUR).state).toBe("breached");
    expect(caseSla({ status: "approved", slaDueAt: due, decidedAt: new Date(NOW - HOUR).toISOString() }).state).toBe("met");
    expect(caseSla({ status: "rejected", slaDueAt: due, decidedAt: new Date(NOW + HOUR).toISOString() }).state).toBe("missed");

    const { db, lead } = await setup();
    insertCase(db, { slaDueAt: new Date(Date.now() - HOUR).toISOString() });
    insertCase(db, { assignedTo: null });
    insertCase(db, { status: "approved", decidedBy: "analyst", decidedAt: new Date().toISOString() });
    const rows = listCases(db, lead);
    expect(rows[0]!.sla.state).toBe("breached");
    expect(rows.at(-1)!.status).toBe("approved");
    expect(queueStats(rows)).toMatchObject({ open: 2, breached: 1, unassigned: 1, closed: 1 });
  });

  it("audits every state change in a verifiable hash chain", async () => {
    const { db, analyst, lead } = await setup();
    const c = insertCase(db, { assignedTo: null });
    assignCase(db, lead, c.id, { assigneeId: "analyst" });
    decideCase(db, analyst, c.id, "escalate", "Altered document");
    decideCase(db, lead, c.id, "reject", "Confirmed forgery");
    expect(listAuditEvents(db, { entityId: c.id }).map((e) => e.action)).toEqual(["case.reject", "case.escalate", "case.assign"]);
    expect(verifyAuditChain(db).ok).toBe(true);
  });
});
