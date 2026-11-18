import { audit } from "@acme/platform/audit";
import { groupRoles, type Db } from "@acme/platform/db";
import { kycCases, type DocumentType, type KycCase, type KycStatus, type NationalIdType } from "./schema";
import { SYSTEM_ACTOR } from "./service";
import { requiresSignoff, riskLevelFor } from "./workflow";

/** Tiny deterministic PRNG so every reviewer gets identical data. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

const CUSTOMERS: [name: string, dob: string, idType: NationalIdType, id: string, address: string, email: string][] = [
  ["Hannah Fischer", "1988-03-14", "ssn", "512-44-8821", "41 Elm Street, Portland, OR 97201", "hannah.fischer@example.com"],
  ["Omar Haddad", "1979-11-02", "national_id", "AE-784-1979-2231456-1", "Apt 1204, Marina Tower, Dubai", "omar.haddad@example.net"],
  ["Lucia Romero", "1995-07-23", "ssn", "623-19-0457", "908 Bay Road, Miami, FL 33139", "lucia.romero@example.org"],
  ["Kenji Watanabe", "1983-01-30", "national_id", "JP-3301-8842-1190", "2-14 Shibuya, Tokyo 150-0002", "kenji.w@example.com"],
  ["Grace Okonkwo", "1991-05-09", "ssn", "401-72-6613", "17 Lakeview Drive, Chicago, IL 60614", "grace.okonkwo@example.com"],
  ["Viktor Petrov", "1969-09-18", "national_id", "BG-6909187721", "12 Vitosha Blvd, Sofia 1000", "v.petrov@example.net"],
  ["Amelia Clarke", "2001-12-05", "ssn", "288-61-3390", "5 Harbor Lane, Boston, MA 02110", "amelia.clarke@example.org"],
  ["Rahul Mehta", "1986-04-27", "national_id", "IN-4421-7781-0093", "22 Marine Drive, Mumbai 400020", "rahul.mehta@example.com"],
  ["Sofia Lindqvist", "1993-08-11", "national_id", "SE-930811-4482", "Storgatan 8, Stockholm 114 51", "sofia.l@example.com"],
  ["Daniel Moreno", "1975-02-16", "ssn", "534-08-2276", "300 Pine Ave, Austin, TX 78701", "daniel.moreno@example.net"],
  ["Fatima Zahra", "1990-10-03", "national_id", "MA-K449201", "14 Rue Atlas, Casablanca 20000", "fatima.zahra@example.org"],
  ["Ethan Brooks", "1998-06-21", "ssn", "219-55-7104", "77 Maple Court, Denver, CO 80202", "ethan.brooks@example.com"],
];
const DOCS: DocumentType[] = ["passport", "drivers_license", "national_id_card", "residence_permit"];

/** One entry per case: status, assignee, and whether to force an enhanced-due-diligence profile. */
const PLAN: { status: KycStatus; assignee: string | null; edd?: boolean; escalatedBy?: string }[] = [
  { status: "pending_review", assignee: "u_grace" },
  { status: "pending_review", assignee: "u_grace", edd: true },
  { status: "pending_review", assignee: "u_grace" },
  { status: "pending_review", assignee: "u_grace", edd: false },
  { status: "pending_review", assignee: "u_grace", edd: true },
  { status: "pending_review", assignee: "u_grace" },
  { status: "pending_review", assignee: "u_diego" },
  { status: "pending_review", assignee: "u_diego", edd: false },
  { status: "pending_review", assignee: null },
  { status: "pending_review", assignee: null, edd: true },
  { status: "pending_signoff", assignee: "u_grace", edd: true },
  { status: "pending_signoff", assignee: "u_grace", edd: true },
  { status: "pending_signoff", assignee: "u_grace", edd: true },
  { status: "escalated", assignee: "u_grace", escalatedBy: "u_grace" },
  { status: "escalated", assignee: "u_grace", edd: true, escalatedBy: "u_grace" },
  // Escalated by the only lead: maker-checker means Diego cannot resolve it himself.
  { status: "escalated", assignee: "u_diego", edd: true, escalatedBy: "u_diego" },
  { status: "approved", assignee: "u_grace", edd: false },
  { status: "approved", assignee: "u_grace", edd: false },
  { status: "approved", assignee: "u_grace", edd: true },
  { status: "approved", assignee: "u_diego", edd: false },
  { status: "approved", assignee: "u_grace", edd: false },
  { status: "rejected", assignee: "u_grace" },
  { status: "rejected", assignee: "u_grace", edd: true },
  { status: "rejected", assignee: "u_diego" },
];

const SCREENING = {
  sanctions: ["Possible match on OFAC SDN list (name 86%, DOB year match).", "Possible match on EU consolidated sanctions list (name 81%, nationality match)."],
  pep: ["Matched as PEP: former municipal council member (2014–2019).", "Matched as close associate of a PEP (family member of a state official)."],
};

export function seedKyc(db: Db) {
  const rand = rng(7);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  db.transaction((tx) => {
    tx.insert(groupRoles)
      .values([
        { groupId: "g_kyc_analysts", roleKey: "kyc.analyst" },
        { groupId: "g_kyc_leads", roleKey: "kyc.lead" },
        { groupId: "g_internal_audit", roleKey: "kyc.auditor" },
      ])
      .run();

    PLAN.forEach((plan, i) => {
      const [customerName, dateOfBirth, nationalIdType, nationalId, address, email] = CUSTOMERS[i % CUSTOMERS.length]!;
      let riskScore = 5 + Math.floor(rand() * 60);
      let sanctionsHit = false;
      let pepHit = false;
      if (plan.edd === true) {
        const kind = pick(["high", "sanctions", "pep", "high_pep"] as const);
        if (kind === "high" || kind === "high_pep") riskScore = 70 + Math.floor(rand() * 28);
        sanctionsHit = kind === "sanctions";
        pepHit = kind === "pep" || kind === "high_pep";
      } else if (plan.edd === undefined && rand() < 0.15) riskScore = 70 + Math.floor(rand() * 28);
      const riskLevel = riskLevelFor(riskScore);
      const profile = { riskLevel, sanctionsHit, pepHit };
      const edd = requiresSignoff(profile);
      const screeningSummary = [sanctionsHit && pick(SCREENING.sanctions), pepHit && pick(SCREENING.pep)].filter(Boolean).join(" ") || null;

      // Ages spread so the queue has breached, due-soon and comfortable cases. SLA: 24h for EDD, 72h otherwise.
      const slaHours = edd ? 24 : 72;
      const open = plan.status !== "approved" && plan.status !== "rejected";
      const createdHoursAgo = open ? [2, 30, 60, 80, 20, 95, 10, 66, 5, 26, 18, 30, 8, 40, 22, 12][i % 16]! : 100 + i * 7;
      const createdAt = hoursAgo(createdHoursAgo);
      const slaDueAt = hoursAgo(createdHoursAgo - slaHours);
      const assignedAt = hoursAgo(createdHoursAgo - 0.5);
      const midAt = hoursAgo(createdHoursAgo - Math.min(slaHours, createdHoursAgo) * 0.4);
      const decidedAt = open ? null : hoursAgo(createdHoursAgo - (i % 5 === 0 ? slaHours + 6 : slaHours * 0.6));

      const id = `KYC-${2001 + i}`;
      const entity = { type: "kyc_case", id };
      const row: KycCase = {
        id,
        customerName,
        dateOfBirth,
        nationalIdType,
        nationalId,
        address,
        email,
        documentType: pick(DOCS),
        riskScore,
        riskLevel,
        sanctionsHit,
        pepHit,
        screeningSummary,
        assignedTo: plan.assignee,
        status: plan.status,
        slaDueAt,
        createdBy: SYSTEM_ACTOR,
        createdAt,
        submittedBy: null,
        submittedAt: null,
        escalatedBy: null,
        escalatedAt: null,
        decidedBy: null,
        decidedAt,
        decisionReason: null,
      };
      audit(tx, { at: createdAt, actorId: SYSTEM_ACTOR, app: "kyc", action: "case.open", entity, after: { status: "pending_review", riskScore, riskLevel, sanctionsHit, pepHit } });
      if (plan.assignee) audit(tx, { at: assignedAt, actorId: "u_diego", app: "kyc", action: "case.reassign", entity, before: { assignedTo: null }, after: { assignedTo: plan.assignee } });

      if (plan.status === "pending_signoff" || (plan.status === "approved" && edd)) {
        Object.assign(row, { submittedBy: plan.assignee, submittedAt: midAt });
        audit(tx, { at: midAt, actorId: plan.assignee!, app: "kyc", action: "case.submit_for_signoff", entity, before: { status: "pending_review" }, after: { status: "pending_signoff" } });
      }
      if (plan.status === "escalated") {
        const reason = edd ? "Screening hit could not be discounted with the documents provided." : "Address on document does not match proof of address.";
        Object.assign(row, { escalatedBy: plan.escalatedBy, escalatedAt: midAt });
        audit(tx, { at: midAt, actorId: plan.escalatedBy!, app: "kyc", action: "case.escalate", entity, before: { status: "pending_review" }, after: { status: "escalated" }, reason });
      }
      if (plan.status === "approved") {
        const decidedBy = edd ? "u_diego" : plan.assignee!;
        Object.assign(row, { decidedBy });
        audit(tx, { at: decidedAt!, actorId: decidedBy, app: "kyc", action: "case.approve", entity, before: { status: edd ? "pending_signoff" : "pending_review" }, after: { status: "approved" } });
      }
      if (plan.status === "rejected") {
        const decisionReason = edd ? "Confirmed sanctions/PEP risk outside appetite." : "Document appears altered; liveness check failed.";
        Object.assign(row, { decidedBy: plan.assignee, decisionReason });
        audit(tx, { at: decidedAt!, actorId: plan.assignee!, app: "kyc", action: "case.reject", entity, before: { status: "pending_review" }, after: { status: "rejected" }, reason: decisionReason });
      }
      tx.insert(kycCases).values(row).run();
    });
  });
}
