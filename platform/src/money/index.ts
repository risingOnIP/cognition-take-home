import { z } from "zod";

/** Money is always integer minor units (cents) + ISO currency. Never floats. */
export interface Money {
  amountMinor: number;
  currency: string;
}

const MINOR_DIGITS: Record<string, number> = { USD: 2, EUR: 2, GBP: 2, JPY: 0 };

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency] ?? 2;
}

/** Parses user input like "1,234.5" into minor units without floating-point math. */
export function parseMoneyToMinor(input: string, currency = "USD"): number {
  const digits = minorDigits(currency);
  const s = input.replace(/[,\s$]/g, "");
  const re = digits === 0 ? /^\d+$/ : new RegExp(`^(\\d+)(?:\\.(\\d{1,${digits}}))?$`);
  const m = s.match(re);
  if (!m) throw new Error(`Invalid ${currency} amount: "${input}"`);
  const whole = m[1] ?? s;
  const frac = (m[2] ?? "").padEnd(digits, "0");
  const minor = Number(whole) * 10 ** digits + Number(frac || 0);
  if (!Number.isSafeInteger(minor)) throw new Error("Amount too large");
  return minor;
}

export function formatMoney(amountMinor: number, currency = "USD"): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amountMinor / 10 ** digits);
}

/** Zod field for form input -> positive minor units. */
export function moneyField(currency = "USD", opts: { maxMinor?: number } = {}) {
  return z
    .string()
    .trim()
    .min(1, "Amount is required")
    .transform((v, ctx) => {
      try {
        return parseMoneyToMinor(v, currency);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: (e as Error).message });
        return z.NEVER;
      }
    })
    .refine((v) => v > 0, "Amount must be greater than zero")
    .refine((v) => opts.maxMinor === undefined || v <= opts.maxMinor, "Amount exceeds the allowed maximum");
}
