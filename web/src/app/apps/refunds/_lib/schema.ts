import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const REFUND_STATUSES = ["pending_approval", "approved", "rejected", "paid", "failed"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REASON_CODES = {
  duplicate_charge: "Duplicate charge",
  service_not_rendered: "Service not rendered",
  fraud: "Fraudulent transaction",
  billing_error: "Billing error",
  goodwill: "Goodwill gesture",
} as const;
export type ReasonCode = keyof typeof REASON_CODES;

export const refunds = sqliteTable(
  "refunds",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    reasonCode: text("reason_code").$type<ReasonCode>().notNull(),
    notes: text("notes"),
    status: text("status").$type<RefundStatus>().notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    decidedBy: text("decided_by"),
    decidedAt: text("decided_at"),
    paidBy: text("paid_by"),
    paidAt: text("paid_at"),
    processorRefundId: text("processor_refund_id"),
  },
  (t) => [index("refunds_status_idx").on(t.status), index("refunds_created_by_idx").on(t.createdBy)],
);

export type Refund = typeof refunds.$inferSelect;
