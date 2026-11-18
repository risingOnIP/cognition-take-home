import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const KYC_STATUSES = ["pending_review", "pending_signoff", "escalated", "approved", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const DOCUMENT_TYPES = {
  passport: "Passport",
  drivers_license: "Driver's license",
  national_id_card: "National ID card",
  residence_permit: "Residence permit",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

export const NATIONAL_ID_TYPES = { ssn: "SSN", national_id: "National ID" } as const;
export type NationalIdType = keyof typeof NATIONAL_ID_TYPES;

export type RiskLevel = "low" | "medium" | "high";

export const kycCases = sqliteTable(
  "kyc_cases",
  {
    id: text("id").primaryKey(),
    customerName: text("customer_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    nationalIdType: text("national_id_type").$type<NationalIdType>().notNull(),
    nationalId: text("national_id").notNull(),
    address: text("address").notNull(),
    email: text("email").notNull(),
    documentType: text("document_type").$type<DocumentType>().notNull(),
    riskScore: integer("risk_score").notNull(),
    riskLevel: text("risk_level").$type<RiskLevel>().notNull(),
    sanctionsHit: integer("sanctions_hit", { mode: "boolean" }).notNull().default(false),
    pepHit: integer("pep_hit", { mode: "boolean" }).notNull().default(false),
    screeningSummary: text("screening_summary"),
    assignedTo: text("assigned_to"),
    status: text("status").$type<KycStatus>().notNull(),
    slaDueAt: text("sla_due_at").notNull(),
    /** Who opened the case (the onboarding system for imported cases). */
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    /** Analyst who recommended approval of a case that needs lead sign-off. */
    submittedBy: text("submitted_by"),
    submittedAt: text("submitted_at"),
    escalatedBy: text("escalated_by"),
    escalatedAt: text("escalated_at"),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
    decisionReason: text("decision_reason"),
  },
  (t) => [index("kyc_cases_status_idx").on(t.status), index("kyc_cases_assigned_to_idx").on(t.assignedTo), index("kyc_cases_sla_idx").on(t.slaDueAt)],
);

export type KycCase = typeof kycCases.$inferSelect;
