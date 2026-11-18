import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@acme/platform/audit";
import type { Db } from "@acme/platform/db";
import type { PaymentProcessor } from "@acme/platform/connectors";
import { IdempotencyInProgressError, runIdempotent } from "@acme/platform/idempotency";
import { moneyField } from "@acme/platform/money";
import { assertCan, can, rowScope, type CurrentUser } from "@acme/platform/rbac";
import { WorkflowError } from "@acme/platform/workflow";
import { refundsApp } from "../manifest";
import { REASON_CODES, refunds, type ReasonCode, type Refund } from "./schema";
import { refundWorkflow } from "./workflow";

const APP = refundsApp.key;

export const newRefundSchema = z.object({
  paymentId: z.string().trim().regex(/^pay_[a-zA-Z0-9_]+$/, "Payment id must look like pay_…"),
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerEmail: z.email("Valid email required"),
  amount: moneyField("USD", { maxMinor: 5_000_000 }),
  reasonCode: z.enum(Object.keys(REASON_CODES) as [ReasonCode, ...ReasonCode[]], "Pick a reason code"),
  notes: z.string().trim().max(1000).optional(),
});

/** Row-level security: agents see their own refunds, leads and above see all. */
export function listRefunds(db: Db, user: CurrentUser): Refund[] {
  assertCan(user, "refunds.view");
  return db.select().from(refunds).where(rowScope(user, "refunds.view_all", refunds.createdBy)).orderBy(desc(refunds.createdAt)).all();
}

export function getRefund(db: Db, user: CurrentUser, id: string): Refund | null {
  const r = db.select().from(refunds).where(eq(refunds.id, id)).get();
  assertCan(user, "refunds.view");
  // Row-level security: hide (not 403) records outside the user's scope so ids can't be probed.
  if (!r || (r.createdBy !== user.id && !can(user, "refunds.view_all"))) return null;
  return r;
}

function nextId(db: Db): string {
  const row = db.select({ n: sql<number>`count(*)` }).from(refunds).get();
  return `RF-${1001 + (row?.n ?? 0)}`;
}

export function createRefund(db: Db, user: CurrentUser, input: z.infer<typeof newRefundSchema>): Refund {
  assertCan(user, "refunds.request");
  return db.transaction((tx) => {
    const refund = tx
      .insert(refunds)
      .values({
        id: nextId(tx as unknown as Db),
        paymentId: input.paymentId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        amountMinor: input.amount,
        currency: "USD",
        reasonCode: input.reasonCode,
        notes: input.notes || null,
        status: refundWorkflow.initial,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
    audit(tx, { actorId: user.id, app: APP, action: "refund.request", entity: { type: "refund", id: refund.id }, after: { amountMinor: refund.amountMinor, reasonCode: refund.reasonCode, status: refund.status } });
    return refund;
  });
}

/** Approve / reject: pure workflow check, then state change + audit in one transaction. */
export function decideRefund(db: Db, user: CurrentUser, id: string, transition: "approve" | "reject", reason: string | null): Refund {
  const current = getRefund(db, user, id);
  if (!current) throw new WorkflowError("Refund not found");
  const to = refundWorkflow.apply(transition, current, user, reason);
  return db.transaction((tx) => {
    const updated = tx
      .update(refunds)
      .set({ status: to, decidedBy: user.id, decidedAt: new Date().toISOString() })
      .where(and(eq(refunds.id, id), eq(refunds.status, current.status)))
      .returning()
      .get();
    if (!updated) throw new WorkflowError("This refund was changed by someone else. Reload and try again.");
    audit(tx, { actorId: user.id, app: APP, action: `refund.${transition}`, entity: { type: "refund", id }, before: { status: current.status }, after: { status: to }, reason });
    return updated;
  });
}

/**
 * Payout through the payment connector. Idempotency key = refund id, so double-clicks or retries
 * never refund the customer twice (the processor also receives the key).
 */
export async function payRefund(db: Db, user: CurrentUser, id: string, processor: PaymentProcessor): Promise<Refund> {
  const current = getRefund(db, user, id);
  if (!current) throw new WorkflowError("Refund not found");
  refundWorkflow.apply("pay", current, user);
  const idempotencyKey = `refund:${id}`;
  let outcome;
  try {
    outcome = await runIdempotent(db, "refunds.pay", idempotencyKey, () =>
      processor.refund({ paymentId: current.paymentId, amountMinor: current.amountMinor, currency: current.currency, idempotencyKey }),
    );
  } catch (e) {
    if (e instanceof IdempotencyInProgressError) throw new WorkflowError("This payout is already being processed.");
    throw e;
  }
  const { result, replayed } = outcome;
  const to = result.status === "succeeded" ? "paid" : "failed";
  return db.transaction((tx) => {
    const updated = tx
      .update(refunds)
      .set({ status: to, paidBy: user.id, paidAt: result.processedAt, processorRefundId: result.refundId })
      .where(and(eq(refunds.id, id), eq(refunds.status, current.status)))
      .returning()
      .get();
    if (!updated) throw new WorkflowError("This refund was changed by someone else. Reload and try again.");
    audit(tx, {
      actorId: user.id,
      app: APP,
      action: to === "paid" ? "refund.pay" : "refund.pay_failed",
      entity: { type: "refund", id },
      before: { status: current.status },
      after: { status: to, processorRefundId: result.refundId, processor: processor.name, replayed },
    });
    return updated;
  });
}

export function refundStats(rows: Refund[]) {
  const sum = (s: Refund[]) => s.reduce((a, r) => a + r.amountMinor, 0);
  const pending = rows.filter((r) => r.status === "pending_approval");
  const approved = rows.filter((r) => r.status === "approved");
  const paid = rows.filter((r) => r.status === "paid");
  return {
    pendingCount: pending.length,
    pendingMinor: sum(pending),
    approvedCount: approved.length,
    approvedMinor: sum(approved),
    paidCount: paid.length,
    paidMinor: sum(paid),
    failedCount: rows.filter((r) => r.status === "failed").length,
  };
}
