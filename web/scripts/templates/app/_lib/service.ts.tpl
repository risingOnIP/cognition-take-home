import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@acme/platform/audit";
import type { Db } from "@acme/platform/db";
import { assertCan, can, rowScope, type CurrentUser } from "@acme/platform/rbac";
import { WorkflowError } from "@acme/platform/workflow";
import { __camel__App } from "../manifest";
import { __camel__Items, type __Pascal__Item } from "./schema";
import { __camel__Workflow } from "./workflow";

const APP = __camel__App.key;

export const newItemSchema = z.object({ title: z.string().trim().min(3, "Title is required") });

export function listItems(db: Db, user: CurrentUser): __Pascal__Item[] {
  assertCan(user, "__key__.view");
  return db.select().from(__camel__Items).where(rowScope(user, "__key__.view_all", __camel__Items.createdBy)).orderBy(desc(__camel__Items.createdAt)).all();
}

export function getItem(db: Db, user: CurrentUser, id: string): __Pascal__Item | null {
  assertCan(user, "__key__.view");
  const item = db.select().from(__camel__Items).where(eq(__camel__Items.id, id)).get();
  // Row-level security: out-of-scope records look like missing ones (404), so ids can't be probed.
  if (!item || (item.createdBy !== user.id && !can(user, "__key__.view_all"))) return null;
  return item;
}

export function createItem(db: Db, user: CurrentUser, input: z.infer<typeof newItemSchema>): __Pascal__Item {
  assertCan(user, "__key__.create");
  return db.transaction((tx) => {
    const item = tx
      .insert(__camel__Items)
      .values({ id: crypto.randomUUID(), title: input.title, status: __camel__Workflow.initial, createdBy: user.id, createdAt: new Date().toISOString() })
      .returning()
      .get();
    audit(tx, { actorId: user.id, app: APP, action: "item.create", entity: { type: "__key___item", id: item.id }, after: item });
    return item;
  });
}

export function transitionItem(db: Db, user: CurrentUser, id: string, transition: "approve" | "reject", reason: string | null) {
  const current = getItem(db, user, id);
  if (!current) throw new WorkflowError("Not found");
  const to = __camel__Workflow.apply(transition, current, user, reason);
  db.transaction((tx) => {
    const res = tx.update(__camel__Items).set({ status: to }).where(and(eq(__camel__Items.id, id), eq(__camel__Items.status, current.status))).run();
    if (res.changes !== 1) throw new WorkflowError("This item was changed by someone else. Reload and try again.");
    audit(tx, { actorId: user.id, app: APP, action: `item.${transition}`, entity: { type: "__key___item", id }, before: { status: current.status }, after: { status: to }, reason });
  });
}
