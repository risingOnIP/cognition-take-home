import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const CASE_STATUSES = ["in_review", "escalated", "approved", "rejected"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** SLA from case intake to decision, by risk level. */
export const SLA_HOURS: Record<RiskLevel, number> = { low: 72, medium: 48, high: 24 };

export const DOCUMENT_TYPES = {
  passport: "Passport",
  drivers_license: "Driver's license",
  national_id_card: "National ID card",
  residence_permit: "Residence permit",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

export interface ScreeningHit {
  kind: "sanctions" | "pep";
  list: string;
  /** Fuzzy name-match score, 0–100. */
  matchScore: number;
}

/** Cases are opened by the onboarding service, not by a person. */
export const INTAKE_ACTOR = "svc_onboarding";

export const kycCases = sqliteTable(
  "kyc_cases",
  {
    id: text("id").primaryKey(),
    customerName: text("customer_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    nationalId: text("national_id").notNull(),
    address: text("address").notNull(),
    email: text("email").notNull(),
    documentType: text("document_type").$type<DocumentType>().notNull(),
    riskLevel: text("risk_level").$type<RiskLevel>().notNull(),
    screeningHits: text("screening_hits", { mode: "json" }).$type<ScreeningHit[]>().notNull(),
    assignedTo: text("assigned_to"),
    status: text("status").$type<CaseStatus>().notNull(),
    slaDueAt: text("sla_due_at").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    escalatedBy: text("escalated_by"),
    escalatedAt: text("escalated_at"),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
  },
  (t) => [index("kyc_cases_status_idx").on(t.status), index("kyc_cases_assigned_to_idx").on(t.assignedTo)],
);

export type KycCase = typeof kycCases.$inferSelect;
