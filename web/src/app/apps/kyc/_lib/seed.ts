import { audit } from "@acme/platform/audit";
import { groupRoles, type Db } from "@acme/platform/db";
import { INTAKE_ACTOR, kycCases, SLA_HOURS, type CaseStatus, type DocumentType, type RiskLevel, type ScreeningHit } from "./schema";

/** Tiny deterministic PRNG so every reviewer gets identical data. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

const CUSTOMERS = [
  ["Amelia Turner", "742 Evergreen Terrace, Springfield, IL 62704"],
  ["Benjamin Okoro", "18 Harbor View Rd, Portland, ME 04101"],
  ["Chloe Dubois", "55 Rue de Rivoli, Paris, 75001, France"],
  ["Daniel Novak", "9 Wenceslas Sq, Prague, 110 00, Czechia"],
  ["Emma Schneider", "221 Lakeshore Dr, Chicago, IL 60611"],
  ["Farah Haddad", "3 Corniche Rd, Abu Dhabi, UAE"],
  ["Gabriel Silva", "1200 Ocean Ave, Miami, FL 33139"],
  ["Hannah Cohen", "47 Kings Rd, London, SW3 4ND, UK"],
  ["Ivan Petrov", "12 Nevsky Prospekt, St Petersburg, 191186"],
  ["Julia Moreno", "88 Mission St, San Francisco, CA 94105"],
  ["Kenji Watanabe", "5-2 Shibuya, Tokyo, 150-0002, Japan"],
  ["Laura Bianchi", "14 Via Roma, Milan, 20121, Italy"],
] as const;
const DOCS: DocumentType[] = ["passport", "drivers_license", "national_id_card", "residence_permit"];
const RISKS: RiskLevel[] = ["low", "low", "medium", "medium", "high"];
const HIT_LISTS: ScreeningHit[] = [
  { kind: "sanctions", list: "OFAC SDN", matchScore: 87 },
  { kind: "sanctions", list: "EU Consolidated", matchScore: 74 },
  { kind: "pep", list: "PEP (foreign official)", matchScore: 92 },
  { kind: "pep", list: "PEP (relative/close associate)", matchScore: 81 },
];
const REJECT_REASONS = ["Document expired", "Selfie does not match ID photo", "Address could not be verified", "Confirmed sanctions match"];
const ESCALATE_REASONS = ["Possible PEP match, need lead review", "ID document looks altered", "Name matches sanctions list entry"];

const ANALYST = "u_grace";
const LEAD = "u_diego";

/**
 * 24 cases covering every status: open cases (some breaching SLA, some unassigned), escalations
 * (one escalated by the lead to show maker-checker), approvals and rejections.
 */
export function seedKyc(db: Db) {
  const rand = rng(7);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const now = Date.now();
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();

  db.transaction((tx) => {
    tx.insert(groupRoles)
      .values([
        { groupId: "g_compliance", roleKey: "kyc.analyst" },
        { groupId: "g_compliance_leads", roleKey: "kyc.lead" },
      ])
      .run();

    for (let i = 0; i < 24; i++) {
      const id = `KYC-${2001 + i}`;
      const [customerName, address] = CUSTOMERS[i % CUSTOMERS.length]!;
      const status: CaseStatus = i < 12 ? "in_review" : i < 16 ? "escalated" : i < 20 ? "approved" : "rejected";
      const riskLevel = i === 1 || i === 6 ? "high" : pick(RISKS);
      const screeningHits = i === 3 || i === 13 || rand() < 0.2 ? [pick(HIT_LISTS)] : [];
      const createdHoursAgo = status === "in_review" ? 1 + i * 7 + Math.floor(rand() * 5) : 30 + i * 4 + Math.floor(rand() * 10);
      const createdAt = at(createdHoursAgo);
      const slaDueAt = at(createdHoursAgo - SLA_HOURS[riskLevel]);
      const assignedTo = status === "in_review" && i % 5 === 0 ? null : (status === "in_review" && i % 5 === 4) || i === 15 ? LEAD : ANALYST;
      const escalatedBy = status === "escalated" || i === 16 ? assignedTo : null;
      const needsLead = riskLevel === "high" || screeningHits.length > 0 || !!escalatedBy;
      const decidedBy = status === "approved" ? (needsLead ? LEAD : ANALYST) : status === "rejected" ? ANALYST : null;
      const assignedAt = at(createdHoursAgo - 1);
      const escalatedAt = escalatedBy ? at(createdHoursAgo - 4) : null;
      const decidedAt = decidedBy ? at(createdHoursAgo - 6 - Math.floor(rand() * 40)) : null;
      const slug = customerName.toLowerCase().replace(/[^a-z]+/g, ".");

      tx.insert(kycCases)
        .values({
          id,
          customerName,
          dateOfBirth: `${1950 + Math.floor(rand() * 50)}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
          nationalId: `${100 + Math.floor(rand() * 800)}-${10 + Math.floor(rand() * 89)}-${1000 + Math.floor(rand() * 8999)}`,
          address,
          email: `${slug}@example.com`,
          documentType: pick(DOCS),
          riskLevel,
          screeningHits,
          assignedTo,
          status,
          slaDueAt,
          createdBy: INTAKE_ACTOR,
          createdAt,
          escalatedBy,
          escalatedAt,
          decidedBy,
          decidedAt,
        })
        .run();

      const entity = { type: "kyc_case", id };
      audit(tx, { at: createdAt, actorId: INTAKE_ACTOR, app: "kyc", action: "case.open", entity, after: { status: "in_review", riskLevel, screeningHits: screeningHits.length } });
      if (assignedTo) audit(tx, { at: assignedAt, actorId: LEAD, app: "kyc", action: "case.assign", entity, before: { assignedTo: null }, after: { assignedTo } });
      if (escalatedBy && escalatedAt) {
        audit(tx, { at: escalatedAt, actorId: escalatedBy, app: "kyc", action: "case.escalate", entity, before: { status: "in_review" }, after: { status: "escalated" }, reason: pick(ESCALATE_REASONS) });
      }
      if (decidedBy && decidedAt) {
        const action = status === "approved" ? "case.approve" : "case.reject";
        audit(tx, {
          at: decidedAt,
          actorId: decidedBy,
          app: "kyc",
          action,
          entity,
          before: { status: escalatedBy ? "escalated" : "in_review" },
          after: { status },
          reason: status === "rejected" ? pick(REJECT_REASONS) : null,
        });
      }
    }
  });
}
