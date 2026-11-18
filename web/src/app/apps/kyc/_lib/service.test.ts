import { describe, expect, it } from "vitest";
import { listAuditEvents, verifyAuditChain } from "@acme/platform/audit";
import type { Db } from "@acme/platform/db";
import { buildRoleCatalog } from "@acme/platform/registry";
import { createTestDb, createTestUser } from "@acme/platform/testing";
import { kycApp } from "../manifest";
import * as schema from "./schema";
import { kycCases, type KycCase } from "./schema";
import { getCase, listCases, maskCase, reassignCase, revealCaseField, slaState, SYSTEM_ACTOR, transitionCase } from "./service";
import { availableKyc, blockedReason } from "./workflow";

const catalog = buildRoleCatalog([kycApp]);

async function setup() {
  const db = await createTestDb(schema);
  return {
    db,
    analyst: createTestUser(db, catalog, "analyst", ["kyc.analyst"]),
    analyst2: createTestUser(db, catalog, "analyst2", ["kyc.analyst"]),
    lead: createTestUser(db, catalog, "lead", ["kyc.lead"]),
    lead2: createTestUser(db, catalog, "lead2", ["kyc.lead"]),
    auditor: createTestUser(db, catalog, "auditor", ["kyc.auditor"]),
  };
}

let n = 0;
function insertCase(db: Db, overrides: Partial<KycCase> = {}): KycCase {
  const now = new Date().toISOString();
  return db
    .insert(kycCases)
    .values({
      id: `KYC-T${++n}`,
      customerName: "Jane Doe",
      dateOfBirth: "1990-04-12",
      nationalIdType: "ssn",
      nationalId: "123-45-6789",
      address: "1 Main St, Springfield, IL 62701",
      email: "jane@example.com",
      documentType: "passport",
      riskScore: 20,
      riskLevel: "low",
      status: "pending_review",
      assignedTo: "analyst",
      slaDueAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      createdBy: SYSTEM_ACTOR,
      createdAt: now,
      ...overrides,
    })
    .returning()
    .get();
}

describe("kyc service", () => {
  it("scopes rows: analysts see only their assigned cases, leads and auditors see all", async () => {
    const { db, analyst, analyst2, lead, auditor } = await setup();
    const mine = insertCase(db);
    insertCase(db, { assignedTo: "analyst2" });
    insertCase(db, { assignedTo: null });
    expect(listCases(db, analyst).map((c) => c.id)).toEqual([mine.id]);
    expect(getCase(db, analyst2, mine.id)).toBeNull();
    expect(listCases(db, lead)).toHaveLength(3);
    expect(listCases(db, auditor)).toHaveLength(3);
  });

  it("lets the assigned analyst approve a standard case, and requires reasons to reject or escalate", async () => {
    const { db, analyst, lead } = await setup();
    const c = insertCase(db);
    expect(() => transitionCase(db, lead, c.id, "approve", null)).toThrow(/assigned analyst/);
    expect(() => transitionCase(db, analyst, c.id, "reject", null)).toThrow(/reason is required/);
    expect(() => transitionCase(db, analyst, c.id, "escalate", " ")).toThrow(/reason is required/);
    expect(availableKyc(c, analyst)).toEqual(["approve", "reject", "escalate"]);
    const approved = transitionCase(db, analyst, c.id, "approve", null);
    expect(approved).toMatchObject({ status: "approved", decidedBy: "analyst" });
  });

  it("routes high-risk and screening-hit approvals to a lead, with maker-checker", async () => {
    const { db, analyst, lead } = await setup();
    for (const profile of [{ riskScore: 85, riskLevel: "high" as const }, { sanctionsHit: true }, { pepHit: true }]) {
      const c = insertCase(db, profile);
      expect(() => transitionCase(db, analyst, c.id, "approve", null)).toThrow(/sign-off/);
      expect(availableKyc(c, analyst)).toEqual(["reject", "escalate", "submit_for_signoff"]);
      const submitted = transitionCase(db, analyst, c.id, "submit_for_signoff", null);
      expect(submitted).toMatchObject({ status: "pending_signoff", submittedBy: "analyst" });
      expect(() => transitionCase(db, analyst, c.id, "approve", null)).toThrow(/kyc.signoff/);
      expect(transitionCase(db, lead, c.id, "approve", "Docs verified, hit discounted").status).toBe("approved");
    }
  });

  it("a lead cannot sign off their own submission or approve a high-risk case alone", async () => {
    const { db, lead, lead2 } = await setup();
    const c = insertCase(db, { assignedTo: "lead", riskScore: 90, riskLevel: "high" });
    expect(() => transitionCase(db, lead, c.id, "approve", null)).toThrow(/sign-off/);
    transitionCase(db, lead, c.id, "submit_for_signoff", null);
    expect(() => transitionCase(db, lead, c.id, "approve", null)).toThrow(/Maker-checker/);
    expect(transitionCase(db, lead2, c.id, "approve", null).status).toBe("approved");
  });

  it("nobody may approve their own escalation", async () => {
    const { db, analyst, lead, lead2 } = await setup();
    const own = insertCase(db, { assignedTo: "lead" });
    transitionCase(db, lead, own.id, "escalate", "Unclear source of funds");
    const escalated = getCase(db, lead, own.id)!;
    expect(availableKyc(escalated, lead)).toEqual([]);
    expect(blockedReason(escalated, lead)).toMatch(/Maker-checker/);
    expect(() => transitionCase(db, lead, own.id, "approve", null)).toThrow(/Maker-checker/);
    expect(() => transitionCase(db, lead, own.id, "send_back", "withdraw")).toThrow(/Maker-checker/);
    expect(transitionCase(db, lead2, own.id, "approve", "Resolved")).toMatchObject({ status: "approved", decidedBy: "lead2" });

    const c = insertCase(db);
    transitionCase(db, analyst, c.id, "escalate", "Document mismatch");
    expect(() => transitionCase(db, analyst, c.id, "approve", null)).toThrow(/kyc.escalation.resolve/);
    const back = transitionCase(db, lead, c.id, "send_back", "Request a new proof of address");
    expect(back).toMatchObject({ status: "pending_review", escalatedBy: null });
  });

  it("gives internal audit read-only access", async () => {
    const { db, auditor } = await setup();
    const c = insertCase(db);
    expect(getCase(db, auditor, c.id)).not.toBeNull();
    expect(availableKyc(c, auditor)).toEqual([]);
    expect(() => transitionCase(db, auditor, c.id, "approve", null)).toThrow(/kyc.decide/);
    expect(() => reassignCase(db, auditor, c.id, { assignedTo: "analyst2" })).toThrow(/kyc.assign/);
    expect(() => revealCaseField(db, auditor, c.id, "nationalId", "audit sample")).toThrow(/kyc.pii.reveal/);
  });

  it("masks PII by default and audits reveals with a reason", async () => {
    const { db, analyst, analyst2 } = await setup();
    const c = insertCase(db);
    const masked = maskCase(c);
    expect(masked.nationalId).toBe("***-**-6789");
    expect(Object.values(masked).join(" ")).not.toMatch(/123-45|jane@|1990-04-12|1 Main St/);
    expect(() => revealCaseField(db, analyst, c.id, "nationalId", "  ")).toThrow(/reason/);
    expect(() => revealCaseField(db, analyst2, c.id, "nationalId", "curious")).toThrow(/not found/);
    expect(revealCaseField(db, analyst, c.id, "nationalId", "Matching against document")).toBe("123-45-6789");
    const [event] = listAuditEvents(db, { entityId: c.id, app: "kyc" });
    expect(event).toMatchObject({ action: "pii.reveal", actorId: "analyst", reason: "Matching against document" });
  });

  it("lets only leads reassign, to users who can review, and audits it", async () => {
    const { db, analyst, lead } = await setup();
    const c = insertCase(db, { assignedTo: null });
    expect(() => reassignCase(db, analyst, c.id, { assignedTo: "analyst" })).toThrow(/kyc.assign/);
    expect(() => reassignCase(db, lead, c.id, { assignedTo: "auditor" })).toThrow(/can't review/);
    expect(reassignCase(db, lead, c.id, { assignedTo: "analyst2", reason: "Workload" }).assignedTo).toBe("analyst2");
    expect(listAuditEvents(db, { entityId: c.id })[0]).toMatchObject({ action: "case.reassign", actorId: "lead", reason: "Workload" });
  });

  it("records every state change in the hash-chained audit trail", async () => {
    const { db, analyst, lead } = await setup();
    const c = insertCase(db, { pepHit: true });
    transitionCase(db, analyst, c.id, "submit_for_signoff", null);
    transitionCase(db, lead, c.id, "send_back", "Need source of wealth");
    transitionCase(db, analyst, c.id, "submit_for_signoff", null);
    transitionCase(db, lead, c.id, "reject", "PEP exposure outside appetite");
    expect(listAuditEvents(db, { entityId: c.id }).map((e) => e.action)).toEqual(["case.reject", "case.submit_for_signoff", "case.send_back", "case.submit_for_signoff"]);
    expect(verifyAuditChain(db).ok).toBe(true);
  });

  it("computes SLA aging and breaches", () => {
    const now = Date.parse("2026-01-10T12:00:00Z");
    expect(slaState({ status: "pending_review", slaDueAt: "2026-01-10T06:00:00Z", decidedAt: null }, now)).toMatchObject({ breached: true, tone: "danger", label: "Breached 6h ago" });
    expect(slaState({ status: "escalated", slaDueAt: "2026-01-11T00:00:00Z", decidedAt: null }, now)).toMatchObject({ breached: false, tone: "warning", label: "Due in 12h" });
    expect(slaState({ status: "pending_review", slaDueAt: "2026-01-13T12:00:00Z", decidedAt: null }, now)).toMatchObject({ tone: "success", label: "Due in 3d" });
    expect(slaState({ status: "approved", slaDueAt: "2026-01-10T06:00:00Z", decidedAt: "2026-01-10T07:00:00Z" }, now)).toMatchObject({ label: "Missed", breached: true });
  });
});
