import { describe, expect, it } from "vitest";
import { formatMoney, moneyField, parseMoneyToMinor } from ".";

describe("money", () => {
  it("parses to integer minor units without float error", () => {
    expect(parseMoneyToMinor("0.29")).toBe(29);
    expect(parseMoneyToMinor("1,234.5")).toBe(123450);
    expect(parseMoneyToMinor("$19.99")).toBe(1999);
    expect(parseMoneyToMinor("500", "JPY")).toBe(500);
  });
  it("rejects ambiguous input", () => {
    for (const bad of ["1.234", "-5", "abc", "1e3", ""]) expect(() => parseMoneyToMinor(bad)).toThrow();
  });
  it("formats", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });
  it("zod field enforces positive and max", () => {
    const f = moneyField("USD", { maxMinor: 10_000 });
    expect(f.safeParse("12.00").data).toBe(1200);
    expect(f.safeParse("0").success).toBe(false);
    expect(f.safeParse("100.01").success).toBe(false);
  });
});
