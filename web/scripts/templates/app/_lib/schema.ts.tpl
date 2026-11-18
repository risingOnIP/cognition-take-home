import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const __camel__Items = sqliteTable("__key___items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export type __Pascal__Item = typeof __camel__Items.$inferSelect;
