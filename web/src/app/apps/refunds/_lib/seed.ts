import { audit } from "@acme/platform/audit";
import { groupRoles, type Db } from "@acme/platform/db";
import { refunds, type ReasonCode, type RefundStatus } from "./schema";

/** Tiny deterministic PRNG so every reviewer gets identical data. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

const CUSTOMERS = [
  ["Olivia Martin", "olivia.martin@example.com"],
  ["Noah Williams", "noah.w@example.com"],
  ["Ava Johnson", "ava.johnson@example.org"],
  ["Liam Brown", "liam.brown@example.net"],
  ["Mia Garcia", "mia.garcia@example.com"],
  ["Ethan Davis", "ethan.d@example.com"],
  ["Sophia Lopez", "sophia.lopez@example.org"],
  ["Lucas Wilson", "lucas.wilson@example.com"],
] as const;
const REASONS: ReasonCode[] = ["duplicate_charge", "service_not_rendered", "fraud", "billing_error", "goodwill"];
const AMOUNTS = [1_299, 4_500, 12_000, 24_999, 49_900, 75_000, 150_000, 320_000, 480_000, 725_000, 1_250_000];

export function seedRefunds(db: Db) {
  const rand = rng(42);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  db.transaction((tx) => {
    tx.insert(groupRoles)
      .values([
        { groupId: "g_support", roleKey: "refunds.agent" },
        { groupId: "g_payments", roleKey: "refunds.approver" },
        { groupId: "g_finance", roleKey: "refunds.finance" },
        // Demo superuser. Not refunds.agent: it conflicts with refunds.finance (SoD).
        { groupId: "g_demo_superusers", roleKey: "refunds.approver" },
        { groupId: "g_demo_superusers", roleKey: "refunds.finance" },
      ])
      .run();

    const statuses: RefundStatus[] = ["pending_approval", "pending_approval", "pending_approval", "approved", "paid", "paid", "rejected"];
    for (let i = 0; i < 28; i++) {
      const [customerName, customerEmail] = pick(CUSTOMERS);
      const amountMinor = pick(AMOUNTS);
      const status = i < 6 ? "pending_approval" : pick(statuses);
      const maker = rand() < 0.5 ? "u_priya" : "u_taylor";
      const checker = amountMinor <= 500_000 ? "u_elena" : "u_sam";
      const id = `RF-${1001 + i}`;
      const createdHoursAgo = 2 + (28 - i) * 9 + Math.floor(rand() * 6);
      const createdAt = hoursAgo(createdHoursAgo);
      const decidedAt = status !== "pending_approval" ? hoursAgo(createdHoursAgo - 3) : null;
      const paidAt = status === "paid" ? hoursAgo(createdHoursAgo - 5) : null;
      const reasonCode = pick(REASONS);
      tx.insert(refunds)
        .values({
          id,
          paymentId: `pay_${(1_000_000 + Math.floor(rand() * 8_999_999)).toString(36)}`,
          customerName,
          customerEmail,
          amountMinor,
          currency: "USD",
          reasonCode,
          notes: null,
          status,
          createdBy: maker,
          createdAt,
          decidedBy: decidedAt ? checker : null,
          decidedAt,
          paidBy: paidAt ? "u_sam" : null,
          paidAt,
          processorRefundId: paidAt ? `re_seed${i}` : null,
        })
        .run();
      const entity = { type: "refund", id };
      audit(tx, { at: createdAt, actorId: maker, app: "refunds", action: "refund.request", entity, after: { amountMinor, reasonCode, status: "pending_approval" } });
      if (decidedAt) {
        const action = status === "rejected" ? "refund.reject" : "refund.approve";
        audit(tx, { at: decidedAt, actorId: checker, app: "refunds", action, entity, before: { status: "pending_approval" }, after: { status: status === "rejected" ? "rejected" : "approved" }, reason: status === "rejected" ? "Outside refund policy window" : null });
      }
      if (paidAt) {
        audit(tx, { at: paidAt, actorId: "u_sam", app: "refunds", action: "refund.pay", entity, before: { status: "approved" }, after: { status: "paid", processorRefundId: `re_seed${i}` } });
      }
    }
  });
}
