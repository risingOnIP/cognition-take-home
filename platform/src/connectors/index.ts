import { createHash } from "node:crypto";

/**
 * Connectors are typed adapters to external systems (the Power Apps "connector" equivalent).
 * Apps depend on the interface; the implementation is chosen in one place (web/src/platform.ts).
 */
export interface PaymentProcessor {
  readonly name: string;
  refund(req: { paymentId: string; amountMinor: number; currency: string; idempotencyKey: string }): Promise<{
    refundId: string;
    status: "succeeded" | "failed";
    processedAt: string;
  }>;
}

/** Deterministic in-memory processor for local dev and tests. Swap for Stripe/Adyen in production. */
export function createMockPaymentProcessor(opts: { latencyMs?: number } = {}): PaymentProcessor {
  return {
    name: "mock-processor",
    async refund(req) {
      if (opts.latencyMs) await new Promise((r) => setTimeout(r, opts.latencyMs));
      const id = createHash("sha256").update(req.idempotencyKey).digest("hex").slice(0, 16);
      return {
        refundId: `re_${id}`,
        status: req.paymentId.startsWith("pay_fail") ? "failed" : "succeeded",
        processedAt: new Date().toISOString(),
      };
    },
  };
}
