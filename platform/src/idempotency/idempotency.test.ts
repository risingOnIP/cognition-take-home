import { describe, expect, it } from "vitest";
import { createTestDb } from "../testing";
import { IdempotencyInProgressError, runIdempotent } from ".";

describe("runIdempotent", () => {
  it("runs once, replays afterwards, and rejects a concurrent duplicate", async () => {
    const db = await createTestDb();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const first = runIdempotent(db, "s", "k", async () => (await gate, ++calls));
    await expect(runIdempotent(db, "s", "k", async () => ++calls)).rejects.toBeInstanceOf(IdempotencyInProgressError);
    release();
    expect(await first).toEqual({ result: 1, replayed: false });
    expect(await runIdempotent(db, "s", "k", async () => ++calls)).toEqual({ result: 1, replayed: true });
    expect(calls).toBe(1);
  });

  it("releases the key when the operation fails", async () => {
    const db = await createTestDb();
    await expect(runIdempotent(db, "s", "k", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(await runIdempotent(db, "s", "k", async () => 2)).toEqual({ result: 2, replayed: false });
  });
});
